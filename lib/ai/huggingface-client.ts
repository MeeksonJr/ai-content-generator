// Hugging Face API client for NLP tasks
import { logger } from "@/lib/utils/logger"

const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY

// Updated working models
const SENTIMENT_MODEL = "cardiffnlp/twitter-roberta-base-sentiment-latest"
const KEYWORD_MODEL = "yanekyuk/bert-keyword-extractor"
const SUMMARIZATION_MODEL = "facebook/bart-large-cnn"

// Maximum number of retries for API calls
const MAX_RETRIES = 2
// Delay between retries in milliseconds
const RETRY_DELAY = 1000
// Maximum input length for summarization to prevent errors
const MAX_SUMMARIZATION_INPUT_LENGTH = 1000

export interface SentimentResult {
  success: boolean
  sentiment: string
  score: number
  error?: string
}

export interface KeywordResult {
  success: boolean
  keywords: Array<{ keyword: string; score: number }>
  error?: string
}

export interface SummarizationResult {
  success: boolean
  summary: string
  error?: string
}

// Helper function to implement retry logic
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES,
  delay = RETRY_DELAY,
): Promise<Response> {
  try {
    const response = await fetch(url, options)

    // If response is 429 (Too Many Requests) or 503 (Service Unavailable), retry
    if ((response.status === 429 || response.status === 503) && retries > 0) {
      logger.warn(`Received ${response.status} from API, retrying in ${delay}ms...`, {
        context: "HuggingFace",
        data: { retriesLeft: retries, status: response.status },
      })

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay))

      // Retry with exponential backoff
      return fetchWithRetry(url, options, retries - 1, delay * 2)
    }

    return response
  } catch (error) {
    if (retries > 0) {
      logger.warn(`Network error, retrying in ${delay}ms...`, {
        context: "HuggingFace",
      })

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay))

      // Retry with exponential backoff
      return fetchWithRetry(url, options, retries - 1, delay * 2)
    }

    throw error
  }
}

// Simple fallback sentiment analysis
function fallbackSentimentAnalysis(text: string): SentimentResult {
  const positiveWords = [
    "good",
    "great",
    "excellent",
    "amazing",
    "wonderful",
    "best",
    "love",
    "happy",
    "awesome",
    "fantastic",
    "perfect",
    "outstanding",
    "brilliant",
    "superb",
  ]
  const negativeWords = [
    "bad",
    "worst",
    "terrible",
    "awful",
    "poor",
    "hate",
    "sad",
    "disappointed",
    "horrible",
    "disgusting",
    "pathetic",
    "useless",
    "annoying",
    "frustrating",
  ]

  const lowerText = text.toLowerCase()
  let positiveCount = 0
  let negativeCount = 0

  positiveWords.forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, "g")
    const matches = lowerText.match(regex)
    if (matches) positiveCount += matches.length
  })

  negativeWords.forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, "g")
    const matches = lowerText.match(regex)
    if (matches) negativeCount += matches.length
  })

  let sentiment = "neutral"
  let score = 0.5

  if (positiveCount > negativeCount) {
    sentiment = "positive"
    score = Math.min(0.6 + positiveCount * 0.1, 0.95)
  } else if (negativeCount > positiveCount) {
    sentiment = "negative"
    score = Math.max(0.4 - negativeCount * 0.1, 0.05)
  }

  return {
    success: true,
    sentiment,
    score,
  }
}

// Simple fallback keyword extraction
function fallbackKeywordExtraction(text: string): KeywordResult {
  const stopWords = [
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
    "this",
    "that",
    "these",
    "those",
    "will",
    "would",
    "could",
    "should",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
  ]

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.includes(word))

  const wordCounts: Record<string, number> = {}
  words.forEach((word) => {
    wordCounts[word] = (wordCounts[word] || 0) + 1
  })

  const keywords = Object.entries(wordCounts)
    .map(([word, count]) => ({
      keyword: word,
      score: count / words.length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)

  return {
    success: true,
    keywords,
  }
}

// Analyze sentiment of text
export async function analyzeSentiment(text: string): Promise<SentimentResult> {
  try {
    // Truncate text if it's too long
    const truncatedText = text.length > 2000 ? text.substring(0, 2000) : text

    logger.info("Analyzing sentiment", {
      context: "HuggingFace",
      data: { textLength: truncatedText.length },
    })

    // Try multiple sentiment models
    const sentimentModels = [
      "cardiffnlp/twitter-roberta-base-sentiment-latest",
      "nlptown/bert-base-multilingual-uncased-sentiment",
      "distilbert-base-uncased-finetuned-sst-2-english",
    ]

    for (const model of sentimentModels) {
      try {
        // Make API request to Hugging Face with retry logic
        const response = await fetchWithRetry(`https://router.huggingface.co/hf-inference/models/${model}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${HUGGING_FACE_API_KEY}`,
          },
          body: JSON.stringify({ inputs: truncatedText }),
        })

        // Check if the request was successful
        if (!response.ok) {
          const errorText = await response.text()
          logger.warn(`Sentiment analysis API error with model ${model}: ${response.status}`, {
            context: "HuggingFace",
            data: {
              status: response.status,
              statusText: response.statusText,
              response: errorText.substring(0, 200),
            },
          })
          continue // Try next model
        }

        const data = await response.json()
        logger.debug("Sentiment analysis API response", {
          context: "HuggingFace",
          data: { model, response: JSON.stringify(data).substring(0, 200) + "..." },
        })

        // Process the response
        if (Array.isArray(data) && data.length > 0) {
          // Find the sentiment with the highest score
          const sentiments = data[0]
          let highestScore = 0
          let sentiment = "neutral"

          for (const item of sentiments) {
            if (item.score > highestScore) {
              highestScore = item.score
              sentiment = item.label.toLowerCase()
            }
          }

          // Map labels to standard format
          if (sentiment.includes("positive") || sentiment === "label_2" || sentiment.includes("pos")) {
            sentiment = "positive"
          } else if (sentiment.includes("negative") || sentiment === "label_0" || sentiment.includes("neg")) {
            sentiment = "negative"
          } else {
            sentiment = "neutral"
          }

          logger.info("Sentiment analysis completed", {
            context: "HuggingFace",
            data: { model, sentiment, score: highestScore },
          })

          return {
            success: true,
            sentiment,
            score: highestScore,
          }
        }
      } catch (modelError) {
        logger.warn(`Error with sentiment model ${model}`, {
          context: "HuggingFace",
          data: { error: modelError instanceof Error ? modelError.message : "Unknown error" },
        })
        continue // Try next model
      }
    }

    // All models failed, use fallback
    logger.warn("All sentiment models failed, using fallback", {
      context: "HuggingFace",
    })

    return fallbackSentimentAnalysis(truncatedText)
  } catch (error) {
    logger.error(
      "Error analyzing sentiment, using fallback",
      {
        context: "HuggingFace",
      },
      error as Error,
    )

    // Use fallback analysis
    return fallbackSentimentAnalysis(text)
  }
}

// Extract keywords from text
export async function extractKeywords(text: string): Promise<KeywordResult> {
  try {
    // Truncate text if it's too long
    const truncatedText = text.length > 2000 ? text.substring(0, 2000) : text

    logger.info("Extracting keywords", {
      context: "HuggingFace",
      data: { textLength: truncatedText.length },
    })

    // Try multiple keyword extraction models
    const keywordModels = [
      "yanekyuk/bert-keyword-extractor",
      "ml6team/keyphrase-extraction-kbir-inspec",
      "transformer3/H2-keywordextractor",
    ]

    for (const model of keywordModels) {
      try {
        // Make API request to Hugging Face with retry logic
        const response = await fetchWithRetry(`https://router.huggingface.co/hf-inference/models/${model}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${HUGGING_FACE_API_KEY}`,
          },
          body: JSON.stringify({ inputs: truncatedText }),
        })

        // Check if the request was successful
        if (!response.ok) {
          const errorText = await response.text()
          logger.warn(`Keyword extraction API error with model ${model}: ${response.status}`, {
            context: "HuggingFace",
            data: {
              status: response.status,
              statusText: response.statusText,
              response: errorText.substring(0, 200),
            },
          })
          continue // Try next model
        }

        const data = await response.json()
        logger.debug("Keyword extraction API response", {
          context: "HuggingFace",
          data: { model, response: JSON.stringify(data).substring(0, 200) + "..." },
        })

        // Process the response
        let keywords: Array<{ keyword: string; score: number }> = []

        if (Array.isArray(data) && data.length > 0) {
          keywords = data
            .filter((item) => item.score > 0.1)
            .map((item) => ({
              keyword: item.word || item.text || item.entity || item.label,
              score: item.score,
            }))
            .slice(0, 10)
        }

        // If we got valid keywords, return them
        if (keywords.length > 0) {
          logger.info("Keyword extraction completed", {
            context: "HuggingFace",
            data: { model, keywordCount: keywords.length },
          })

          return {
            success: true,
            keywords,
          }
        }
      } catch (modelError) {
        logger.warn(`Error with keyword model ${model}`, {
          context: "HuggingFace",
          data: { error: modelError instanceof Error ? modelError.message : "Unknown error" },
        })
        continue // Try next model
      }
    }

    // All models failed, use fallback
    logger.info("All keyword models failed, using fallback", { context: "HuggingFace" })
    return fallbackKeywordExtraction(truncatedText)
  } catch (error) {
    logger.error(
      "Error extracting keywords, using fallback",
      {
        context: "HuggingFace",
      },
      error as Error,
    )

    // Use fallback keyword extraction
    return fallbackKeywordExtraction(text)
  }
}

// Summarize text
export async function summarizeText(text: string, maxLength = 150): Promise<SummarizationResult> {
  try {
    // Ensure maxLength is a reasonable value
    const safeMaxLength = Math.min(Math.max(30, maxLength), 500)

    // Truncate text if it's too long for the API
    const truncatedText =
      text.length > MAX_SUMMARIZATION_INPUT_LENGTH ? text.substring(0, MAX_SUMMARIZATION_INPUT_LENGTH) : text

    logger.info("Summarizing text", {
      context: "HuggingFace",
      data: {
        originalLength: text.length,
        truncatedLength: truncatedText.length,
        maxOutputLength: safeMaxLength,
      },
    })

    // If text is very short, just return it as is
    if (truncatedText.length < safeMaxLength * 1.5) {
      logger.info("Text is already short enough, skipping API call", {
        context: "HuggingFace",
        data: { textLength: truncatedText.length, maxLength: safeMaxLength },
      })
      return {
        success: true,
        summary: truncatedText.substring(0, safeMaxLength),
      }
    }

    // Try to use the API
    const response = await fetchWithRetry(`https://router.huggingface.co/hf-inference/models/${SUMMARIZATION_MODEL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${HUGGING_FACE_API_KEY}`,
      },
      body: JSON.stringify({
        inputs: truncatedText,
        parameters: {
          max_length: safeMaxLength,
          min_length: Math.min(30, safeMaxLength / 2),
          do_sample: false,
          early_stopping: true,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error(`Summarization API error: ${response.status} ${response.statusText}`, {
        context: "HuggingFace",
        data: {
          status: response.status,
          statusText: response.statusText,
          response: errorText,
        },
      })

      // Use simple fallback summarization
      const summary = truncatedText.substring(0, safeMaxLength) + "..."
      return {
        success: true,
        summary,
        error: `Using fallback summarization due to API error: ${response.status}`,
      }
    }

    const data = await response.json()
    logger.debug("Summarization API response", {
      context: "HuggingFace",
      data: { response: JSON.stringify(data).substring(0, 200) + "..." },
    })

    // Process the response
    let summary = ""

    if (Array.isArray(data) && data.length > 0 && data[0].summary_text) {
      summary = data[0].summary_text
    } else if (typeof data === "object" && data !== null && data.summary_text) {
      summary = data.summary_text
    } else {
      // Fallback to simple truncation
      summary = truncatedText.substring(0, safeMaxLength) + "..."
    }

    logger.info("Summarization completed", {
      context: "HuggingFace",
      data: { summaryLength: summary.length },
    })

    return {
      success: true,
      summary,
    }
  } catch (error) {
    logger.error(
      "Error in summarization function",
      {
        context: "HuggingFace",
      },
      error as Error,
    )

    // Use fallback summarization
    const summary = text.substring(0, maxLength) + "..."

    return {
      success: true,
      summary,
      error: `Using fallback summarization due to error: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}
