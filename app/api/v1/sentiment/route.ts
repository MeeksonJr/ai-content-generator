import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const json = await req.json()
    const { text } = json

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 })
    }

    const supabase = await createSupabaseRouteClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Simple sentiment analysis
    const sentiment = analyzeSentiment(text)

    // Update usage statistics
    const currentMonth = new Date().toLocaleString("default", {
      month: "long",
    })

    const { data: usageStats, error: usageError } = await supabase
      .from("usage_stats")
      .select("*")
      .eq("user_id", user.id)
      .eq("month", currentMonth)
      .single()

    if (usageStats) {
      // Update existing stats
      await supabase
        .from("usage_stats")
        .update({
          sentiment_analysis_used: (usageStats.sentiment_analysis_used || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", usageStats.id)
    } else {
      // Create new stats record
      await supabase.from("usage_stats").insert({
        user_id: user.id,
        content_generated: 0,
        sentiment_analysis_used: 1,
        keyword_extraction_used: 0,
        text_summarization_used: 0,
        api_calls: 1,
        month: currentMonth,
      })
    }

    return NextResponse.json({ sentiment })
  } catch (error) {
    console.error("Error analyzing sentiment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function analyzeSentiment(text: string): { label: string; score: number } {
  // Simple sentiment analysis using word lists
  const positiveWords = [
    "good",
    "great",
    "excellent",
    "amazing",
    "wonderful",
    "fantastic",
    "awesome",
    "love",
    "like",
    "happy",
    "pleased",
    "satisfied",
    "perfect",
    "brilliant",
    "outstanding",
  ]

  const negativeWords = [
    "bad",
    "terrible",
    "awful",
    "horrible",
    "hate",
    "dislike",
    "angry",
    "sad",
    "disappointed",
    "frustrated",
    "annoyed",
    "upset",
    "poor",
    "worst",
    "disgusting",
  ]

  const words = text.toLowerCase().match(/\b\w+\b/g) || []

  let positiveScore = 0
  let negativeScore = 0

  words.forEach((word) => {
    if (positiveWords.includes(word)) {
      positiveScore++
    } else if (negativeWords.includes(word)) {
      negativeScore++
    }
  })

  const totalScore = positiveScore - negativeScore
  const normalizedScore = Math.max(-1, Math.min(1, totalScore / Math.max(1, words.length / 10)))

  let label = "neutral"
  if (normalizedScore > 0.1) {
    label = "positive"
  } else if (normalizedScore < -0.1) {
    label = "negative"
  }

  return {
    label,
    score: normalizedScore,
  }
}
