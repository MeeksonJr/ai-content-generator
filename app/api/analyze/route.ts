import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { analyzeSentiment, extractKeywords } from "@/lib/ai/huggingface-client"
import { logger } from "@/lib/utils/logger"

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
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
    const { content, analyzeSentiment: shouldAnalyzeSentiment, extractKeywords: shouldExtractKeywords } = body

    if (!content) {
      return NextResponse.json({ error: "Missing required content parameter" }, { status: 400 })
    }

    if (!shouldAnalyzeSentiment && !shouldExtractKeywords) {
      return NextResponse.json({ error: "No analysis requested" }, { status: 400 })
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
      .select("sentiment_analysis_enabled, keyword_extraction_enabled")
      .eq("plan_type", subscription.plan_type)
      .single()

    if (!usageLimits) {
      return NextResponse.json({ error: "Could not determine usage limits" }, { status: 500 })
    }

    // Initialize result object
    const result: {
      sentiment?: string
      keywords?: string[] | { keyword: string; score: number }[]
      fallback?: boolean
    } = {}
    let usedSentimentAnalysis = false
    let usedKeywordExtraction = false

    // Analyze sentiment if requested and enabled for the plan
    if (shouldAnalyzeSentiment) {
      if (!usageLimits.sentiment_analysis_enabled) {
        return NextResponse.json({ error: "Sentiment analysis not available on your current plan" }, { status: 403 })
      }

      try {
        const sentimentResult = await analyzeSentiment(content)

        if (sentimentResult.success) {
          result.sentiment = sentimentResult.sentiment
          usedSentimentAnalysis = true
        } else {
          // Use a fallback sentiment analysis
          logger.warn("Using fallback sentiment analysis", { context: "API" })

          // Simple fallback: check for positive/negative words
          const text = content.toLowerCase()
          const positiveWords = ["good", "great", "excellent", "amazing", "wonderful", "best", "love", "happy"]
          const negativeWords = ["bad", "worst", "terrible", "awful", "poor", "hate", "sad", "disappointed"]

          let positiveCount = 0
          let negativeCount = 0

          positiveWords.forEach((word) => {
            const regex = new RegExp(`\\b${word}\\b`, "g")
            const matches = text.match(regex)
            if (matches) positiveCount += matches.length
          })

          negativeWords.forEach((word) => {
            const regex = new RegExp(`\\b${word}\\b`, "g")
            const matches = text.match(regex)
            if (matches) negativeCount += matches.length
          })

          if (positiveCount > negativeCount) {
            result.sentiment = "positive"
          } else if (negativeCount > positiveCount) {
            result.sentiment = "negative"
          } else {
            result.sentiment = "neutral"
          }

          result.fallback = true
          usedSentimentAnalysis = true
        }
      } catch (error) {
        logger.error("Error in sentiment analysis", { context: "API" }, error as Error)

        // Use a neutral sentiment as fallback
        result.sentiment = "neutral"
        result.fallback = true
        usedSentimentAnalysis = true
      }
    }

    // Extract keywords if requested and enabled for the plan
    if (shouldExtractKeywords) {
      if (!usageLimits.keyword_extraction_enabled) {
        return NextResponse.json({ error: "Keyword extraction not available on your current plan" }, { status: 403 })
      }

      try {
        const keywordResult = await extractKeywords(content)

        if (keywordResult.success) {
          result.keywords = keywordResult.keywords
          usedKeywordExtraction = true
        } else {
          // Use a fallback keyword extraction
          logger.warn("Using fallback keyword extraction", { context: "API" })

          // Simple fallback: extract common words by frequency
          const words = content
            .toLowerCase()
            .replace(/[^\w\s]/g, "")
            .split(/\s+/)
            .filter((word) => word.length > 3)

          const stopWords = [
            "this",
            "that",
            "these",
            "those",
            "with",
            "from",
            "have",
            "will",
            "would",
            "could",
            "should",
            "their",
            "there",
            "about",
            "which",
          ]
          const filteredWords = words.filter((word) => !stopWords.includes(word))

          const wordCounts: Record<string, number> = {}
          filteredWords.forEach((word) => {
            wordCounts[word] = (wordCounts[word] || 0) + 1
          })

          const keywords = Object.entries(wordCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([word]) => word)

          result.keywords = keywords
          result.fallback = true
          usedKeywordExtraction = true
        }
      } catch (error) {
        logger.error("Error in keyword extraction", { context: "API" }, error as Error)

        // Use a simple keyword extraction as fallback
        const words = content
          .toLowerCase()
          .replace(/[^\w\s]/g, "")
          .split(/\s+/)
          .filter((word) => word.length > 3)

        const stopWords = [
          "this",
          "that",
          "these",
          "those",
          "with",
          "from",
          "have",
          "will",
          "would",
          "could",
          "should",
          "their",
          "there",
          "about",
          "which",
        ]
        const filteredWords = words.filter((word) => !stopWords.includes(word))

        const wordCounts: Record<string, number> = {}
        filteredWords.forEach((word) => {
          wordCounts[word] = (wordCounts[word] || 0) + 1
        })

        const keywords = Object.entries(wordCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([word]) => word)

        result.keywords = keywords
        result.fallback = true
        usedKeywordExtraction = true
      }
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
          sentiment_analysis_used: usageStats.sentiment_analysis_used + (usedSentimentAnalysis ? 1 : 0),
          keyword_extraction_used: usageStats.keyword_extraction_used + (usedKeywordExtraction ? 1 : 0),
          updated_at: new Date().toISOString(),
        })
        .eq("id", usageStats.id)
    } else {
      await supabase.from("usage_stats").insert({
        user_id: session.user.id,
        content_generated: 0,
        sentiment_analysis_used: usedSentimentAnalysis ? 1 : 0,
        keyword_extraction_used: usedKeywordExtraction ? 1 : 0,
        text_summarization_used: 0,
        api_calls: 0,
        month: currentMonth,
      })
    }

    // Return the analysis result
    return NextResponse.json(result)
  } catch (error) {
    logger.error("Error in analyze API:", { context: "API" }, error as Error)
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
