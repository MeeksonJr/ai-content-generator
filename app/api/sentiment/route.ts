import { NextResponse } from "next/server"
import { analyzeSentiment } from "@/lib/ai/huggingface-client"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseRouteClient()

    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get request body
    const body = await request.json()
    const { text } = body

    if (!text) {
      return NextResponse.json({ error: "Missing required text parameter" }, { status: 400 })
    }

    // Check user's subscription and usage limits
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan_type, status")
      .eq("user_id", session.user.id)
      .single()

    if (!subscription || subscription.status !== "active") {
      return NextResponse.json({ error: "No active subscription" }, { status: 403 })
    }

    // Get usage limits for the user's plan
    const { data: usageLimits } = await supabase
      .from("usage_limits")
      .select("sentiment_analysis_enabled")
      .eq("plan_type", subscription.plan_type)
      .single()

    if (!usageLimits) {
      return NextResponse.json({ error: "Could not determine usage limits" }, { status: 500 })
    }

    // Check if sentiment analysis is enabled for this plan
    if (!usageLimits.sentiment_analysis_enabled) {
      return NextResponse.json({ error: "Sentiment analysis not available on your current plan" }, { status: 403 })
    }

    // Analyze sentiment
    const result = await analyzeSentiment(text)

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to analyze sentiment" }, { status: 500 })
    }

    // Update usage statistics
    const currentDate = new Date()
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-01`

    const { data: usageStats } = await supabase
      .from("usage_stats")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("month", currentMonth)
      .single()

    if (usageStats) {
      await supabase
        .from("usage_stats")
        .update({
          sentiment_analysis_used: usageStats.sentiment_analysis_used + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", usageStats.id)
    } else {
      await supabase.from("usage_stats").insert({
        user_id: session.user.id,
        content_generated: 0,
        sentiment_analysis_used: 1,
        keyword_extraction_used: 0,
        text_summarization_used: 0,
        api_calls: 0,
        month: currentMonth,
      })
    }

    // Return the sentiment analysis result
    return NextResponse.json({
      sentiment: result.sentiment,
      score: result.score,
    })
  } catch (error) {
    console.error("Error in sentiment analysis API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
