import { logger } from "@/lib/utils/logger"

interface DetailedSentimentResult {
  sentiment: "positive" | "negative" | "neutral"
  confidence: number
  emotions: {
    joy: number
    anger: number
    fear: number
    sadness: number
    surprise: number
    disgust: number
  }
  keywords: string[]
}

export async function generateDetailedSentimentAnalysis(text: string): Promise<DetailedSentimentResult> {
  try {
    // Simple sentiment analysis fallback
    const positiveWords = [
      "good",
      "great",
      "excellent",
      "amazing",
      "wonderful",
      "fantastic",
      "love",
      "like",
      "happy",
      "pleased",
    ]
    const negativeWords = [
      "bad",
      "terrible",
      "awful",
      "hate",
      "dislike",
      "angry",
      "sad",
      "disappointed",
      "frustrated",
      "annoyed",
    ]

    const words = text.toLowerCase().split(/\s+/)
    let positiveCount = 0
    let negativeCount = 0

    words.forEach((word) => {
      if (positiveWords.some((pw) => word.includes(pw))) positiveCount++
      if (negativeWords.some((nw) => word.includes(nw))) negativeCount++
    })

    let sentiment: "positive" | "negative" | "neutral" = "neutral"
    let confidence = 0.5

    if (positiveCount > negativeCount) {
      sentiment = "positive"
      confidence = Math.min(0.9, 0.5 + (positiveCount - negativeCount) * 0.1)
    } else if (negativeCount > positiveCount) {
      sentiment = "negative"
      confidence = Math.min(0.9, 0.5 + (negativeCount - positiveCount) * 0.1)
    }

    // Extract keywords
    const keywords = words
      .filter((word) => word.length > 3)
      .filter((word) => !["this", "that", "with", "have", "will"].includes(word))
      .slice(0, 5)

    logger.info("Generated detailed sentiment analysis", {
      context: "AI",
      data: { sentiment, confidence, keywordCount: keywords.length },
    })

    return {
      sentiment,
      confidence,
      emotions: {
        joy: sentiment === "positive" ? confidence * 0.8 : 0.2,
        anger: sentiment === "negative" ? confidence * 0.7 : 0.1,
        fear: sentiment === "negative" ? confidence * 0.5 : 0.1,
        sadness: sentiment === "negative" ? confidence * 0.6 : 0.1,
        surprise: 0.3,
        disgust: sentiment === "negative" ? confidence * 0.4 : 0.1,
      },
      keywords,
    }
  } catch (error) {
    logger.error("Detailed sentiment analysis error", {
      context: "AI",
      data: { error: error instanceof Error ? error.message : "Unknown error" },
    })

    return {
      sentiment: "neutral",
      confidence: 0.5,
      emotions: {
        joy: 0.2,
        anger: 0.1,
        fear: 0.1,
        sadness: 0.1,
        surprise: 0.1,
        disgust: 0.1,
      },
      keywords: [],
    }
  }
}
