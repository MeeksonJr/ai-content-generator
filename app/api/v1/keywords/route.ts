import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const json = await req.json()
    const { text } = json

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 })
    }

    const supabase = createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Extract keywords using simple algorithm
    const keywords = extractKeywords(text)

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
          keyword_extraction_used: (usageStats.keyword_extraction_used || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", usageStats.id)
    } else {
      // Create new stats record
      await supabase.from("usage_stats").insert({
        user_id: user.id,
        content_generated: 0,
        sentiment_analysis_used: 0,
        keyword_extraction_used: 1,
        text_summarization_used: 0,
        api_calls: 1,
        month: currentMonth,
      })
    }

    return NextResponse.json({ keywords })
  } catch (error) {
    console.error("Error extracting keywords:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function extractKeywords(text: string): string[] {
  // Simple keyword extraction
  const stopWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "can",
    "this",
    "that",
    "these",
    "those",
  ])

  const words = text.toLowerCase().match(/\b\w+\b/g) || []
  const wordFreq: Record<string, number> = {}

  words.forEach((word) => {
    if (word.length > 3 && !stopWords.has(word)) {
      wordFreq[word] = (wordFreq[word] || 0) + 1
    }
  })

  return Object.entries(wordFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word)
}
