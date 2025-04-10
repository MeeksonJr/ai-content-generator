// Hugging Face API client for NLP tasks
import { logger } from "@/lib/utils/logger"

const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY

// Sentiment analysis model
const SENTIMENT_MODEL = "distilbert-base-uncased-finetuned-sst-2-english"
// Keyword extraction model
const KEYWORD_MODEL = "yanekyuk/bert-uncased-keyword-extractor"
// Text summarization model
const SUMMARIZATION_MODEL = "facebook/bart-large-cnn"

// Maximum number of retries for API calls
const MAX_RETRIES = 2
// Delay between retries in milliseconds
const RETRY_DELAY = 1000

interface SentimentResult {
  success: boolean
  sentiment: string
  score: number
  error?: string
}

interface KeywordResult {
  success: boolean
  keywords: Array<{ keyword: string; score: number }>
  error?: string
}

interface SummarizationResult {
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

// Simple fallback summarization when API is unavailable
function fallbackSummarize(text: string, maxLength = 150): string {
  // Simple extractive summarization by taking the first few sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || []

  let summary = ""
  let currentLength = 0

  for (const sentence of sentences) {
    if (currentLength + sentence.length <= maxLength) {
      summary += sentence
      currentLength += sentence.length
    } else {
      break
    }
  }

  // If we couldn't extract sentences or the summary is too short, just truncate
  if (summary.length < 50 && text.length > 0) {
    return text.substring(0, maxLength) + "..."
  }

  return summary
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

    // Make API request to Hugging Face with retry logic
    const response = await fetchWithRetry(`https://api-inference.huggingface.co/models/${SENTIMENT_MODEL}`, {
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
      logger.error(`Sentiment analysis API error: ${response.status} ${response.statusText}`, {
        context: "HuggingFace",
        data: {
          status: response.status,
          statusText: response.statusText,
          response: errorText,
        },
      })

      // Return a default neutral sentiment if the API fails
      return {
        success: false,
        sentiment: "neutral",
        score: 0.5,
        error: `API request failed with status ${response.status}: ${response.status === 503 ? "Service temporarily unavailable" : errorText}`,
      }
    }

    const data = await response.json()
    logger.debug("Sentiment analysis API response", {
      context: "HuggingFace",
      data: { response: JSON.stringify(data).substring(0, 200) + "..." },
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

      // Map LABEL_0 and LABEL_1 to negative and positive
      if (sentiment === "label_0") sentiment = "negative"
      if (sentiment === "label_1") sentiment = "positive"

      logger.info("Sentiment analysis completed", {
        context: "HuggingFace",
        data: { sentiment, score: highestScore },
      })

      return {
        success: true,
        sentiment,
        score: highestScore,
      }
    }

    // Return neutral if the response format is unexpected
    logger.warn("Unexpected sentiment analysis response format", {
      context: "HuggingFace",
      data: { response: data },
    })

    return {
      success: true,
      sentiment: "neutral",
      score: 0.5,
    }
  } catch (error) {
    logger.error(
      "Error analyzing sentiment",
      {
        context: "HuggingFace",
      },
      error as Error,
    )

    // Return a default neutral sentiment if an error occurs
    return {
      success: false,
      sentiment: "neutral",
      score: 0.5,
      error: error instanceof Error ? error.message : "Unknown error",
    }
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

    // Make API request to Hugging Face with retry logic
    const response = await fetchWithRetry(`https://api-inference.huggingface.co/models/${KEYWORD_MODEL}`, {
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
      logger.error(`Keyword extraction API error: ${response.status} ${response.statusText}`, {
        context: "HuggingFace",
        data: {
          status: response.status,
          statusText: response.statusText,
          response: errorText,
        },
      })

      // If service is unavailable, use fallback keyword extraction
      if (response.status === 503) {
        logger.info("Using fallback keyword extraction", { context: "HuggingFace" })

        // Simple fallback: extract common words by frequency
        const words = truncatedText
          .toLowerCase()
          .replace(/[^\w\s]/g, "")
          .split(/\s+/)
          .filter((word) => word.length > 3)

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
          error: "Using fallback extraction due to service unavailability",
        }
      }

      // Return empty keywords if the API fails
      return {
        success: false,
        keywords: [],
        error: `API request failed with status ${response.status}: ${errorText}`,
      }
    }

    const data = await response.json()
    logger.debug("Keyword extraction API response", {
      context: "HuggingFace",
      data: { response: JSON.stringify(data).substring(0, 200) + "..." },
    })

    // Process the response with better error handling
    let keywords: Array<{ keyword: string; score: number }> = []

    // Check if data is an array and has content
    if (Array.isArray(data) && data.length > 0) {
      const firstItem = data[0]

      // Check if the first item is an array (expected format)
      if (Array.isArray(firstItem)) {
        keywords = firstItem
          .filter((item) => item.entity_group === "KEYWORD" && item.score > 0.1)
          .map((item) => ({
            keyword: item.word,
            score: item.score,
          }))
          .slice(0, 10) // Limit to top 10 keywords
      }
      // Handle case where API returns objects with entity property
      else if (typeof firstItem === "object" && firstItem !== null) {
        // Try to extract keywords from different possible formats
        if (Array.isArray(firstItem.entities)) {
          keywords = firstItem.entities
            .filter((item) => item.entity_group === "KEYWORD" && item.score > 0.1)
            .map((item) => ({
              keyword: item.word || item.text,
              score: item.score,
            }))
            .slice(0, 10)
        } else {
          // Extract any properties that might contain keywords
          const possibleKeywords = Object.entries(firstItem)
            .filter(([key, value]) => typeof value === "number" && value > 0.1 && key !== "id" && key !== "score")
            .map(([key, value]) => ({
              keyword: key,
              score: value as number,
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 10)

          if (possibleKeywords.length > 0) {
            keywords = possibleKeywords
          }
        }
      }
    } else if (typeof data === "object" && data !== null) {
      // Handle case where API returns a single object
      const entries = Object.entries(data)
        .filter(([key, value]) => typeof value === "number" && value > 0.1)
        .map(([key, value]) => ({
          keyword: key,
          score: value as number,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)

      if (entries.length > 0) {
        keywords = entries
      }
    }

    // If we couldn't extract keywords in any format, generate some basic ones
    if (keywords.length === 0) {
      logger.warn("Failed to extract keywords from API response, using fallback method", {
        context: "HuggingFace",
      })

      // Extract simple keywords based on word frequency
      const words = truncatedText
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter((word) => word.length > 3)

      const wordCounts: Record<string, number> = {}
      words.forEach((word) => {
        wordCounts[word] = (wordCounts[word] || 0) + 1
      })

      keywords = Object.entries(wordCounts)
        .map(([word, count]) => ({
          keyword: word,
          score: count / words.length,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
    }

    logger.info("Keyword extraction completed", {
      context: "HuggingFace",
      data: { keywordCount: keywords.length },
    })

    return {
      success: true,
      keywords,
    }
  } catch (error) {
    logger.error(
      "Error extracting keywords",
      {
        context: "HuggingFace",
      },
      error as Error,
    )

    // Return empty keywords if an error occurs
    return {
      success: false,
      keywords: [],
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// Summarize text
export async function summarizeText(text: string, maxLength = 150): Promise<SummarizationResult> {
  try {
    // Truncate text if it's too long for the API
    const truncatedText = text.length > 5000 ? text.substring(0, 5000) : text

    logger.info("Summarizing text", {
      context: "HuggingFace",
      data: { textLength: truncatedText.length, maxLength },
    })

    // Make API request to Hugging Face with retry logic
    const response = await fetchWithRetry(`https://api-inference.huggingface.co/models/${SUMMARIZATION_MODEL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${HUGGING_FACE_API_KEY}`,
      },
      body: JSON.stringify({
        inputs: truncatedText,
        parameters: {
          max_length: maxLength,
          min_length: Math.min(30, maxLength / 2),
          do_sample: false,
        },
      }),
    })

    // Check if the request was successful
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

      // If service is unavailable, use fallback summarization
      if (response.status === 503) {
        logger.info("Using fallback summarization", { context: "HuggingFace" })
        const summary = fallbackSummarize(truncatedText, maxLength)

        return {
          success: true,
          summary,
          error: "Using fallback summarization due to service unavailability",
        }
      }

      // Return a simple summary if the API fails
      return {
        success: false,
        summary: truncatedText.substring(0, maxLength) + "...",
        error: `API request failed with status ${response.status}: ${errorText}`,
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
    } else if (typeof data === "object" && data !== null && data.generated_text) {
      summary = data.generated_text
    } else {
      // Fallback to a simple truncation if we can't parse the response
      logger.warn("Unexpected summarization response format, using fallback method", {
        context: "HuggingFace",
        data: { response: data },
      })
      summary = fallbackSummarize(truncatedText, maxLength)
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
      "Error summarizing text",
      {
        context: "HuggingFace",
      },
      error as Error,
    )

    // Use fallback summarization if an error occurs
    const summary = fallbackSummarize(text, maxLength)

    return {
      success: true,
      summary,
      error: `Using fallback summarization due to error: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}
