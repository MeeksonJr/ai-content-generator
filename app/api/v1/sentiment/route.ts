import { NextResponse } from "next/server"
import { analyzeSentiment } from "@/lib/ai/huggingface-client"
import { logger } from "@/lib/utils/logger"

export async function POST(request: Request) {
  try {
    // Get API key from Authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logger.warn("Missing or invalid Authorization header in API request", {
        context: "API",
        data: { path: "/api/v1/sentiment" },
      })
      return NextResponse.json({ error: "Missing or invalid Authorization header" }, { status: 401 })
    }

    const apiKey = authHeader.substring(7) // Remove 'Bearer ' prefix

    // In a real app, you would validate the API key against a database
    if (!apiKey.startsWith("sk_")) {
      logger.warn("Invalid API key format in API request", {
        context: "API",
        data: { path: "/api/v1/sentiment" },
      })
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
    }

    // Get request body
    const body = await request.json()
    const { text } = body

    if (!text) {
      logger.warn("Missing text parameter in API request", {
        context: "API",
        data: { path: "/api/v1/sentiment" },
      })
      return NextResponse.json({ error: "Missing required text parameter" }, { status: 400 })
    }

    // Analyze sentiment
    const result = await analyzeSentiment(text)

    if (!result.success) {
      logger.error("Failed to analyze sentiment in API request", {
        context: "API",
        data: { error: result.error },
      })
      return NextResponse.json({ error: result.error || "Failed to analyze sentiment" }, { status: 500 })
    }

    logger.info("Successfully analyzed sentiment via API", {
      context: "API",
      data: {
        textLength: text.length,
        sentiment: result.sentiment,
        score: result.score,
      },
    })

    // Return the sentiment analysis result
    return NextResponse.json({
      sentiment: result.sentiment,
      score: result.score,
    })
  } catch (error) {
    logger.error(
      "Error in sentiment analysis API",
      {
        context: "API",
      },
      error as Error,
    )
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
