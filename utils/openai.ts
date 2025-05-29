import { logger } from "@/lib/utils/logger"

interface GenerateKeywordsParams {
  text: string
  maxKeywords?: number
}

interface GenerateKeywordsResult {
  success: boolean
  keywords: string[]
  error?: string
}

export async function generateKeywords({
  text,
  maxKeywords = 10,
}: GenerateKeywordsParams): Promise<GenerateKeywordsResult> {
  try {
    // Simple keyword extraction fallback
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .filter(
        (word) =>
          ![
            "this",
            "that",
            "with",
            "have",
            "will",
            "from",
            "they",
            "been",
            "were",
            "said",
            "each",
            "which",
            "their",
            "time",
            "would",
            "there",
            "could",
            "other",
          ].includes(word),
      )

    const wordCount = words.reduce(
      (acc, word) => {
        acc[word] = (acc[word] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const keywords = Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, maxKeywords)
      .map(([word]) => word)

    logger.info("Successfully generated keywords", {
      context: "OpenAI",
      data: { keywordCount: keywords.length },
    })

    return {
      success: true,
      keywords,
    }
  } catch (error) {
    logger.error("Keyword generation error", {
      context: "OpenAI",
      data: { error: error instanceof Error ? error.message : "Unknown error" },
    })

    return {
      success: false,
      keywords: [],
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
