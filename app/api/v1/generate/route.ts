import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { generateContent } from "@/lib/ai/groq-client"
import { analyzeSentiment, extractKeywords } from "@/lib/ai/huggingface-client"
import { logger } from "@/lib/utils/logger"

// Create Supabase client for server-side operations
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables")
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Default usage limits for different plan types
const DEFAULT_USAGE_LIMITS = {
  free: {
    monthly_content_limit: 5,
    max_content_length: 1000,
    sentiment_analysis_enabled: false,
    keyword_extraction_enabled: false,
    text_summarization_enabled: false,
    api_access_enabled: false,
  },
  basic: {
    monthly_content_limit: 20,
    max_content_length: 3000,
    sentiment_analysis_enabled: true,
    keyword_extraction_enabled: true,
    text_summarization_enabled: false,
    api_access_enabled: false,
  },
  professional: {
    monthly_content_limit: 100,
    max_content_length: 10000,
    sentiment_analysis_enabled: true,
    keyword_extraction_enabled: true,
    text_summarization_enabled: true,
    api_access_enabled: true,
  },
  enterprise: {
    monthly_content_limit: -1, // Unlimited
    max_content_length: 50000,
    sentiment_analysis_enabled: true,
    keyword_extraction_enabled: true,
    text_summarization_enabled: true,
    api_access_enabled: true,
  },
}

// Helper function to authenticate API key
async function authenticateApiKey(apiKey: string) {
  if (!apiKey || !apiKey.startsWith("sk_")) {
    return null
  }

  try {
    // Look up the API key in the database
    const { data: apiKeyData, error } = await supabase
      .from("api_keys")
      .select("user_id, is_active, last_used_at")
      .eq("api_key", apiKey)
      .eq("is_active", true)
      .single()

    if (error || !apiKeyData) {
      logger.warn("Invalid API key lookup", {
        context: "API",
        data: { error: error?.message, hasData: !!apiKeyData },
      })
      return null
    }

    // Update last_used_at timestamp
    await supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("api_key", apiKey)

    return apiKeyData.user_id
  } catch (error) {
    logger.error("Error authenticating API key", { context: "API" }, error as Error)
    return null
  }
}

export async function POST(request: Request) {
  try {
    // Check for API key authentication
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logger.warn("Missing or invalid authorization header in API", {
        context: "API",
        data: { path: "/api/v1/generate" },
      })
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    }

    const apiKey = authHeader.replace("Bearer ", "")
    const userId = await authenticateApiKey(apiKey)

    if (!userId) {
      logger.warn("Invalid API key in generate API", {
        context: "API",
        data: { apiKey: apiKey.substring(0, 10) + "..." },
      })
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
    }

    // Get request body
    const body = await request.json()
    const { contentType, title, prompt, temperature, maxLength } = body

    if (!contentType || !prompt) {
      logger.warn("Missing required parameters in API", {
        context: "API",
        userId,
        data: { contentType, hasPrompt: !!prompt },
      })
      return NextResponse.json({ error: "Missing required parameters: contentType and prompt" }, { status: 400 })
    }

    // Check user's subscription and usage limits
    const { data: subscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("plan_type, status")
      .eq("user_id", userId)
      .maybeSingle()

    if (subscriptionError && subscriptionError.code !== "PGRST116") {
      logger.error("Error fetching subscription for API", {
        context: "API",
        userId,
        data: { error: subscriptionError },
      })
      return NextResponse.json({ error: "Failed to fetch subscription" }, { status: 500 })
    }

    // Default to professional plan for API users if no subscription exists
    const planType = subscription?.plan_type || "professional"
    const subscriptionStatus = subscription?.status || "active"

    // Get usage limits for the user's plan
    const { data: usageLimits, error: limitsError } = await supabase
      .from("usage_limits")
      .select("*")
      .eq("plan_type", planType)
      .maybeSingle()

    // If no usage limits found in the database, use default values
    const defaultLimits =
      DEFAULT_USAGE_LIMITS[planType as keyof typeof DEFAULT_USAGE_LIMITS] || DEFAULT_USAGE_LIMITS.professional

    // Use database values if available, otherwise use defaults
    const planLimits = usageLimits || defaultLimits

    if (limitsError && limitsError.code !== "PGRST116") {
      logger.error("Error fetching usage limits for API", {
        context: "API",
        userId,
        data: { error: limitsError, planType },
      })
      // Continue with default limits
    }

    // Check if API access is enabled for this plan
    if (!planLimits.api_access_enabled) {
      logger.warn("API access not available on current plan", {
        context: "API",
        userId,
        data: { planType },
      })
      return NextResponse.json({ error: "API access not available on your current plan" }, { status: 403 })
    }

    // Get current month's usage
    const currentDate = new Date()
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-01`

    const { data: usageStats, error: statsError } = await supabase
      .from("usage_stats")
      .select("*")
      .eq("user_id", userId)
      .eq("month", currentMonth)
      .maybeSingle()

    if (statsError && statsError.code !== "PGRST116") {
      logger.error("Error fetching usage stats for API", {
        context: "API",
        userId,
        data: { error: statsError },
      })
      // Continue without strict usage checking
    }

    // Check if user has reached their content generation limit
    if (
      planLimits.monthly_content_limit !== -1 &&
      usageStats &&
      usageStats.api_calls >= planLimits.monthly_content_limit
    ) {
      logger.warn("User reached API call limit", {
        context: "API",
        userId,
        data: { limit: planLimits.monthly_content_limit, used: usageStats.api_calls },
      })
      return NextResponse.json({ error: "Monthly API call limit reached" }, { status: 403 })
    }

    // Generate content using Groq
    const contentResult = await generateContent({
      contentType,
      title: title || "Untitled",
      prompt,
      temperature: temperature || 0.7,
      maxLength: maxLength || 1024,
    })

    if (!contentResult.success && !contentResult.fallback) {
      logger.error("Content generation failed for API", {
        context: "API",
        userId,
        data: { error: contentResult.error },
      })
      return NextResponse.json({ error: contentResult.error || "Failed to generate content" }, { status: 500 })
    }

    // Perform additional NLP tasks based on subscription
    let sentimentResult = { success: true, sentiment: "neutral", score: 0.5 }
    let keywordsResult: { success: boolean; keywords: { keyword: string; score: number }[] } = {
      success: true,
      keywords: [],
    }

    // Try to perform sentiment analysis if enabled
    if (planLimits.sentiment_analysis_enabled) {
      try {
        sentimentResult = await analyzeSentiment(contentResult.content)
      } catch (error) {
        logger.error("Error in sentiment analysis for API:", { context: "API", userId }, error as Error)
        // Continue with default values
      }
    }

    // Try to perform keyword extraction if enabled
    if (planLimits.keyword_extraction_enabled) {
      try {
        keywordsResult = await extractKeywords(contentResult.content)
      } catch (error) {
        logger.error("Error in keyword extraction for API:", { context: "API", userId }, error as Error)
        // Continue with default values
      }
    }

    // Update usage statistics
    if (usageStats) {
      // Update existing stats
      await supabase
        .from("usage_stats")
        .update({
          api_calls: usageStats.api_calls + 1,
          content_generated: usageStats.content_generated + 1,
          sentiment_analysis_used:
            planLimits.sentiment_analysis_enabled && sentimentResult.success
              ? usageStats.sentiment_analysis_used + 1
              : usageStats.sentiment_analysis_used,
          keyword_extraction_used:
            planLimits.keyword_extraction_enabled && keywordsResult.success
              ? usageStats.keyword_extraction_used + 1
              : usageStats.keyword_extraction_used,
          updated_at: new Date().toISOString(),
        })
        .eq("id", usageStats.id)
    } else {
      // Create new stats record
      await supabase.from("usage_stats").insert({
        user_id: userId,
        content_generated: 1,
        sentiment_analysis_used: planLimits.sentiment_analysis_enabled && sentimentResult.success ? 1 : 0,
        keyword_extraction_used: planLimits.keyword_extraction_enabled && keywordsResult.success ? 1 : 0,
        text_summarization_used: 0,
        api_calls: 1,
        month: currentMonth,
      })
    }

    logger.info("Successfully generated content via API", {
      context: "API",
      userId,
      data: {
        contentType,
        contentLength: contentResult.content.length,
        usedFallback: contentResult.fallback,
      },
    })

    // Return the generated content and analysis
    return NextResponse.json({
      content: contentResult.content,
      sentiment: sentimentResult.sentiment,
      sentimentScore: sentimentResult.score,
      keywords: keywordsResult.keywords,
      fallback: contentResult.fallback || false,
    })
  } catch (error) {
    logger.error("Error in content generation API:", { context: "API" }, error as Error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
