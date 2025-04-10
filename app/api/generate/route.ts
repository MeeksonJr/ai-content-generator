import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { generateContent } from "@/lib/ai/gemini-client"
import { analyzeSentiment, extractKeywords } from "@/lib/ai/huggingface-client"
import { logger } from "@/lib/utils/logger"

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get request body
    const body = await request.json()
    const { contentType, title, prompt, temperature, maxLength } = body

    if (!contentType || !prompt) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Check user's subscription and usage limits
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan_type, status")
      .eq("user_id", session.user.id)
      .single()

    // If no subscription exists, create a temporary one for demo purposes
    // In a production environment, you would redirect to subscription page
    const planType = subscription?.status === "active" ? subscription.plan_type : "professional"

    // Get usage limits for the user's plan
    let { data: usageLimits } = await supabase.from("usage_limits").select("*").eq("plan_type", planType).single()

    // If no usage limits found, use default values
    if (!usageLimits) {
      usageLimits = {
        monthly_content_limit: 200,
        max_content_length: 10000,
        sentiment_analysis_enabled: true,
        keyword_extraction_enabled: true,
        text_summarization_enabled: true,
        api_access_enabled: false,
      }
    }

    // Get current month's usage
    const currentDate = new Date()
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-01`

    const { data: usageStats } = await supabase
      .from("usage_stats")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("month", currentMonth)
      .single()

    // Check if user has reached their content generation limit
    if (usageStats && usageStats.content_generated >= usageLimits.monthly_content_limit) {
      return NextResponse.json({ error: "Monthly content generation limit reached" }, { status: 403 })
    }

    // Generate content
    const contentResult = await generateContent({
      contentType,
      title: title || "Untitled",
      prompt,
      temperature: temperature || 0.7,
      maxLength: maxLength || 1024,
    })

    if (!contentResult.success && !contentResult.fallback) {
      return NextResponse.json({ error: contentResult.error || "Failed to generate content" }, { status: 500 })
    }

    // Perform additional NLP tasks based on subscription
    // Initialize with default values in case the API calls fail
    let sentimentResult = { success: true, sentiment: "neutral", score: 0.5 }
    let keywordsResult = { success: true, keywords: [] }

    // Try to perform sentiment analysis if enabled
    if (usageLimits.sentiment_analysis_enabled) {
      try {
        sentimentResult = await analyzeSentiment(contentResult.content)
      } catch (error) {
        logger.error("Error in sentiment analysis:", error)
        // Continue with default values
      }
    }

    // Try to perform keyword extraction if enabled
    if (usageLimits.keyword_extraction_enabled) {
      try {
        keywordsResult = await extractKeywords(contentResult.content)
      } catch (error) {
        logger.error("Error in keyword extraction:", error)
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
      })
    }

    // Return the generated content and analysis
    return NextResponse.json({
      content: contentResult.content,
      sentiment: sentimentResult.sentiment,
      sentimentScore: sentimentResult.score,
      keywords: keywordsResult.keywords,
      fallback: contentResult.fallback || false,
    })
  } catch (error) {
    logger.error("Error in content generation API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
