import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { summarizeText } from "@/lib/ai/huggingface-client"
import { logger } from "@/lib/utils/logger"

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

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      logger.warn("Unauthorized access attempt to summarize API", {
        context: "API",
        data: { path: "/api/summarize" },
      })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Get request body
    const body = await request.json()
    const { text, maxLength } = body

    if (!text) {
      logger.warn("Missing text parameter in summarize API", {
        context: "API",
        userId,
      })
      return NextResponse.json({ error: "Missing required text parameter" }, { status: 400 })
    }

    // Check user's subscription and usage limits
    const { data: subscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("plan_type, status")
      .eq("user_id", userId)
      .maybeSingle()

    if (subscriptionError && subscriptionError.code !== "PGRST116") {
      logger.error("Error fetching subscription for summarize API", {
        context: "API",
        userId,
        data: { error: subscriptionError },
      })
      return NextResponse.json({ error: "Failed to fetch subscription" }, { status: 500 })
    }

    // Default to free plan if no subscription exists
    const planType = subscription?.plan_type || "free"
    const subscriptionStatus = subscription?.status || "inactive"

    if (subscriptionStatus !== "active") {
      logger.warn("No active subscription for summarize API", {
        context: "API",
        userId,
        data: { subscription },
      })
      return NextResponse.json({ error: "No active subscription" }, { status: 403 })
    }

    // Get usage limits for the user's plan
    const { data: usageLimits, error: limitsError } = await supabase
      .from("usage_limits")
      .select("text_summarization_enabled")
      .eq("plan_type", planType)
      .maybeSingle()

    // If no usage limits found in the database, use default values
    const defaultLimits =
      DEFAULT_USAGE_LIMITS[planType as keyof typeof DEFAULT_USAGE_LIMITS] || DEFAULT_USAGE_LIMITS.free

    // Use database values if available, otherwise use defaults
    const planLimits = usageLimits || {
      text_summarization_enabled: defaultLimits.text_summarization_enabled,
    }

    if (limitsError && limitsError.code !== "PGRST116") {
      logger.error("Error fetching usage limits for summarize API", {
        context: "API",
        userId,
        data: { error: limitsError, planType },
      })
      // Continue with default limits instead of returning an error
      logger.info("Using default usage limits for summarize API", {
        context: "API",
        userId,
        data: { planType, defaultLimits },
      })
    }

    // Check if text summarization is enabled for this plan
    if (!planLimits.text_summarization_enabled) {
      logger.warn("Text summarization not available on current plan", {
        context: "API",
        userId,
        data: { planType },
      })
      return NextResponse.json({ error: "Text summarization not available on your current plan" }, { status: 403 })
    }

    // Summarize text
    const result = await summarizeText(text, maxLength || 150)

    // Update usage statistics
    const currentDate = new Date()
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-01`

    const { data: usageStats, error: statsError } = await supabase
      .from("usage_stats")
      .select("*")
      .eq("user_id", userId)
      .eq("month", currentMonth)
      .maybeSingle()

    if (statsError && statsError.code !== "PGRST116") {
      logger.error("Error fetching usage stats for summarize API", {
        context: "API",
        userId,
        data: { error: statsError },
      })
      // Continue without updating stats
    }

    if (usageStats) {
      await supabase
        .from("usage_stats")
        .update({
          text_summarization_used: usageStats.text_summarization_used + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", usageStats.id)
    } else {
      await supabase.from("usage_stats").insert({
        user_id: userId,
        content_generated: 0,
        sentiment_analysis_used: 0,
        keyword_extraction_used: 0,
        text_summarization_used: 1,
        api_calls: 0,
        month: currentMonth,
      })
    }

    logger.info("Successfully summarized text", {
      context: "API",
      userId,
      data: {
        textLength: text.length,
        summaryLength: result.summary.length,
        usedFallback: !!result.error,
      },
    })

    // Return the summarization result
    const response: any = {
      summary: result.summary,
    }

    // If there was an error but we still have a summary (fallback), include it as a warning
    if (result.error && result.success) {
      response.warning = "Using fallback summarization due to service unavailability"
    }

    return NextResponse.json(response)
  } catch (error) {
    logger.error(
      "Error in text summarization API",
      {
        context: "API",
      },
      error as Error,
    )
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
