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

    // Simple text summarization using basic algorithm
    const summary = summarizeText(text)

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
          text_summarization_used: (usageStats.text_summarization_used || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", usageStats.id)
    } else {
      // Create new stats record
      await supabase.from("usage_stats").insert({
        user_id: user.id,
        content_generated: 0,
        sentiment_analysis_used: 0,
        keyword_extraction_used: 0,
        text_summarization_used: 1,
        api_calls: 1,
        month: currentMonth,
      })
    }

    return NextResponse.json({ summary })
  } catch (error) {
    console.error("Error summarizing text:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function summarizeText(text: string): string {
  // Simple extractive summarization
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0)

  if (sentences.length <= 3) {
    return text
  }

  // Score sentences based on word frequency
  const words = text.toLowerCase().match(/\b\w+\b/g) || []
  const wordFreq: Record<string, number> = {}

  words.forEach((word) => {
    if (word.length > 3) {
      wordFreq[word] = (wordFreq[word] || 0) + 1
    }
  })

  const sentenceScores = sentences.map((sentence) => {
    const sentenceWords = sentence.toLowerCase().match(/\b\w+\b/g) || []
    const score = sentenceWords.reduce((sum, word) => sum + (wordFreq[word] || 0), 0)
    return { sentence: sentence.trim(), score }
  })

  // Get top 3 sentences
  const topSentences = sentenceScores
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.sentence)

  return topSentences.join(". ") + "."
}
