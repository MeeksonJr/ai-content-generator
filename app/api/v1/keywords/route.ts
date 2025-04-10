import { NextResponse } from "next/server"
import { extractKeywords } from "@/lib/ai/huggingface-client"
import { logger } from "@/lib/utils/logger"

export async function POST(request: Request) {
  try {
    // Get API key from Authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logger.warn("Missing or invalid Authorization header in API request", {
        context: "API",
        data: { path: "/api/v1/keywords" },
      })
      return NextResponse.json({ error: "Missing or invalid Authorization header" }, { status: 401 })
    }

    const apiKey = authHeader.substring(7) // Remove 'Bearer ' prefix

    // In a real app, you would validate the API key against a database
    if (!apiKey.startsWith("sk_")) {
      logger.warn("Invalid API key format in API request", {
        context: "API",
        data: { path: "/api/v1/keywords" },
      })
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
    }

    // Get request body
    const body = await request.json()
    const { text } = body

    if (!text) {
      logger.warn("Missing text parameter in API request", {
        context: "API",
        data: { path: "/api/v1/keywords" },
      })
      return NextResponse.json({ error: "Missing required text parameter" }, { status: 400 })
    }

    // Extract keywords
    const result = await extractKeywords(text)

    if (!result.success) {
      logger.error("Failed to extract keywords in API request", {
        context: "API",
        data: { error: result.error },
      })
      return NextResponse.json({ error: result.error || "Failed to extract keywords" }, { status: 500 })
    }

    logger.info("Successfully extracted keywords via API", {
      context: "API",
      data: {
        textLength: text.length,
        keywordCount: result.keywords.length,
      },
    })

    // Return the keyword extraction result
    return NextResponse.json({
      keywords: result.keywords,
    })
  } catch (error) {
    logger.error(
      "Error in keyword extraction API",
      {
        context: "API",
      },
      error as Error,
    )
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
