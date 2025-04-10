import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { generateContent } from "@/lib/ai/gemini-client"
import { analyzeSentiment, extractKeywords } from "@/lib/ai/huggingface-client"
import { logger } from "@/lib/utils/logger"

export async function POST(request: Request) {
  try {
    // Get API key from Authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logger.warn("Missing or invalid Authorization header in API request", {
        context: "API",
        data: { path: "/api/v1/generate" },
      })
      return NextResponse.json({ error: "Missing or invalid Authorization header" }, { status: 401 })
    }

    const apiKey = authHeader.substring(7) // Remove 'Bearer ' prefix

    // In a real app, you would validate the API key against a database
    // For now, we'll just check if it starts with 'sk_'
    if (!apiKey.startsWith("sk_")) {
      logger.warn("Invalid API key format in API request", {
        context: "API",
        data: { path: "/api/v1/generate" },
      })
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
    }

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Get request body
    const body = await request.json()
    const { contentType, title, prompt } = body

    if (!contentType || !title || !prompt) {
      logger.warn("Missing required parameters in API request", {
        context: "API",
        data: { path: "/api/v1/generate", contentType, hasTitle: !!title, hasPrompt: !!prompt },
      })
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // In a real app, you would look up the user associated with this API key
    // and check their subscription status and usage limits
    // For now, we'll assume they have an enterprise subscription

    // Generate content
    const contentResult = await generateContent({
      contentType,
      title,
      prompt,
    })

    if (!contentResult.success) {
      logger.error("Failed to generate content in API request", {
        context: "API",
        data: { error: contentResult.error },
      })
      return NextResponse.json({ error: contentResult.error || "Failed to generate content" }, { status: 500 })
    }

    // Perform additional NLP tasks
    let sentimentResult = { success: true, sentiment: "neutral", score: 0.5 }
    let keywordsResult = { success: true, keywords: [] }

    try {
      sentimentResult = await analyzeSentiment(contentResult.content)
    } catch (error) {
      logger.error(
        "Error in sentiment analysis during API request",
        {
          context: "API",
        },
        error as Error,
      )
      // Continue with default values
    }

    try {
      keywordsResult = await extractKeywords(contentResult.content)
    } catch (error) {
      logger.error(
        "Error in keyword extraction during API request",
        {
          context: "API",
        },
        error as Error,
      )
      // Continue with default values
    }

    // In a real app, you would update usage statistics for the user
    // associated with this API key

    logger.info("Successfully generated content via API", {
      context: "API",
      data: {
        contentType,
        contentLength: contentResult.content.length,
        keywordCount: keywordsResult.keywords.length,
      },
    })

    // Return the generated content and analysis
    return NextResponse.json({
      content: contentResult.content,
      sentiment: sentimentResult.sentiment,
      sentimentScore: sentimentResult.score,
      keywords: keywordsResult.keywords,
    })
  } catch (error) {
    logger.error(
      "Error in content generation API",
      {
        context: "API",
      },
      error as Error,
    )
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
