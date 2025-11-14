import { NextResponse } from "next/server"
import type { Database } from "@/lib/database.types"
import { generateContentWithGemini } from "@/lib/ai/gemini-client"
import { analyzeSentiment, extractKeywords, type KeywordResult } from "@/lib/ai/huggingface-client"
import { getDefaultUsageLimits } from "@/lib/constants/usage-limits"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { logger } from "@/lib/utils/logger"

type SubscriptionRow = Database["public"]["Tables"]["subscriptions"]["Row"]
type UsageLimitsRow = Database["public"]["Tables"]["usage_limits"]["Row"]
type UsageStatsRow = Database["public"]["Tables"]["usage_stats"]["Row"]

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseRouteClient()

    // Check if user is authenticated
    const sessionResult = await supabase.auth.getSession()
    const session = sessionResult.data.session

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get request body
    const body = await request.json()
    const { contentType, title, prompt } = body

    if (!contentType || !title || !prompt) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Check user's subscription and usage limits
    const subscriptionResponse = await supabase
      .from("subscriptions")
      .select("plan_type, status")
      .eq("user_id", session.user.id)
      .maybeSingle()

    if (subscriptionResponse.error && subscriptionResponse.error.code !== "PGRST116") {
      logger.error("Error fetching subscription for AI generate route", {
        context: "AIGenerate",
        userId: session.user.id,
        data: { error: subscriptionResponse.error },
      })
      return NextResponse.json({ error: "Failed to fetch subscription" }, { status: 500 })
    }

    const subscriptionData = subscriptionResponse.data as Pick<SubscriptionRow, "plan_type" | "status"> | null
    const planType = subscriptionData?.status === "active" ? subscriptionData.plan_type : "professional"

    // Get usage limits for the user's plan
    const usageLimitsResponse = await supabase
      .from("usage_limits")
      .select("*")
      .eq("plan_type", planType)
      .maybeSingle()

    if (usageLimitsResponse.error && usageLimitsResponse.error.code !== "PGRST116") {
      logger.error("Error fetching usage limits for AI generate route", {
        context: "AIGenerate",
        userId: session.user.id,
        data: { error: usageLimitsResponse.error },
      })
      return NextResponse.json({ error: "Failed to fetch usage limits" }, { status: 500 })
    }

    const usageLimits = (usageLimitsResponse.data as UsageLimitsRow | null) || getDefaultUsageLimits(planType)

    // Get current month's usage
    const currentDate = new Date()
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-01`

    const usageStatsResponse = await supabase
      .from("usage_stats")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("month", currentMonth)
      .maybeSingle()

    if (usageStatsResponse.error && usageStatsResponse.error.code !== "PGRST116") {
      logger.error("Error fetching usage stats for AI generate route", {
        context: "AIGenerate",
        userId: session.user.id,
        data: { error: usageStatsResponse.error },
      })
      return NextResponse.json({ error: "Failed to fetch usage stats" }, { status: 500 })
    }

    const usageStats = usageStatsResponse.data as UsageStatsRow | null

    // Check if user has reached their content generation limit
    if (
      usageStats &&
      usageLimits.monthly_content_limit !== -1 &&
      usageStats.content_generated >= usageLimits.monthly_content_limit
    ) {
      return NextResponse.json({ error: "Monthly content generation limit reached" }, { status: 403 })
    }

    // Generate content
    const promptTemplate = `
You are an expert AI writer. Create a ${contentType} titled "${title}".
The user provided the following requirements/instructions:
${prompt}

Deliver a polished, well-structured, and engaging piece that matches the requested content type.
Ensure the output is unique, factual, and ready for publication.
`

    const generatedContent = await generateContentWithGemini(promptTemplate)

    // Perform additional NLP tasks based on subscription
    // Initialize with default values in case the API calls fail
    let sentimentResult = { success: true, sentiment: "neutral", score: 0.5 }
    let keywordsResult: KeywordResult = { success: true, keywords: [] }

    // Try to perform sentiment analysis if enabled
    if (usageLimits.sentiment_analysis_enabled) {
      try {
        sentimentResult = await analyzeSentiment(generatedContent)
      } catch (error) {
        logger.error("Error in sentiment analysis", { context: "AIGenerate" }, error as Error)
        // Continue with default values
      }
    }

    // Try to perform keyword extraction if enabled
    if (usageLimits.keyword_extraction_enabled) {
      try {
        keywordsResult = await extractKeywords(generatedContent)
      } catch (error) {
        logger.error("Error in keyword extraction", { context: "AIGenerate" }, error as Error)
        // Continue with default values
      }
    }

    // Update usage statistics
    if (usageStats) {
      // Update existing stats
      await supabase
        .from("usage_stats")
        .update({
          content_generated: usageStats.content_generated + 1,
          sentiment_analysis_used:
            usageLimits.sentiment_analysis_enabled && sentimentResult.success
              ? usageStats.sentiment_analysis_used + 1
              : usageStats.sentiment_analysis_used,
          keyword_extraction_used:
            usageLimits.keyword_extraction_enabled && keywordsResult.success
              ? usageStats.keyword_extraction_used + 1
              : usageStats.keyword_extraction_used,
          updated_at: new Date().toISOString(),
        })
        .eq("id", usageStats.id)
    } else {
      // Create new stats record
      await supabase.from("usage_stats").insert({
        user_id: session.user.id,
        content_generated: 1,
        sentiment_analysis_used: usageLimits.sentiment_analysis_enabled && sentimentResult.success ? 1 : 0,
        keyword_extraction_used: usageLimits.keyword_extraction_enabled && keywordsResult.success ? 1 : 0,
        text_summarization_used: 0,
        api_calls: 0,
        month: currentMonth,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }

    // Return the generated content and analysis
    return NextResponse.json({
      content: generatedContent,
      sentiment: sentimentResult.sentiment,
      sentimentScore: sentimentResult.score,
      keywords: keywordsResult.keywords,
    })
  } catch (error) {
    logger.error("Error in content generation API", { context: "AIGenerate" }, error as Error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
