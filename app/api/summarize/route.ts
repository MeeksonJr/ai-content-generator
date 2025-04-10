import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { summarizeText } from "@/lib/ai/huggingface-client"
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
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan_type, status")
      .eq("user_id", userId)
      .single()

    if (!subscription || subscription.status !== "active") {
      logger.warn("No active subscription for summarize API", {
        context: "API",
        userId,
        data: { subscription },
      })
      return NextResponse.json({ error: "No active subscription" }, { status: 403 })
    }

    // Get usage limits for the user's plan
    const { data: usageLimits } = await supabase
      .from("usage_limits")
      .select("text_summarization_enabled")
      .eq("plan_type", subscription.plan_type)
      .single()

    if (!usageLimits) {
      logger.error("Could not determine usage limits for summarize API", {
        context: "API",
        userId,
        data: { planType: subscription.plan_type },
      })
      return NextResponse.json({ error: "Could not determine usage limits" }, { status: 500 })
    }

    // Check if text summarization is enabled for this plan
    if (!usageLimits.text_summarization_enabled) {
      logger.warn("Text summarization not available on current plan", {
        context: "API",
        userId,
        data: { planType: subscription.plan_type },
      })
      return NextResponse.json({ error: "Text summarization not available on your current plan" }, { status: 403 })
    }

    // Summarize text
    const result = await summarizeText(text, maxLength || 150)

    // Update usage statistics
    const currentDate = new Date()
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-01`

    const { data: usageStats } = await supabase
      .from("usage_stats")
      .select("*")
      .eq("user_id", userId)
      .eq("month", currentMonth)
      .single()

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
