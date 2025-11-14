import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { GoogleGenerativeAI } from "@google/generative-ai"
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
      logger.warn("Unauthorized access attempt to enhance content API", {
        context: "API",
        data: { path: "/api/ai/enhance" },
      })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Get request body
    const body = await request.json()
    const { content, contentType, tone } = body

    if (!content) {
      logger.warn("Missing content in enhance API", {
        context: "API",
        userId,
      })
      return NextResponse.json({ error: "Missing required content parameter" }, { status: 400 })
    }

    // Check if user has reached their usage limit
    // First get the user's subscription
    const { data: subscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("plan_type")
      .eq("user_id", userId)
      .single()

    if (subscriptionError && subscriptionError.code !== "PGRST116") {
      // PGRST116 is "no rows returned" which is fine for new users
      logger.error("Error fetching subscription", {
        context: "API",
        userId,
        data: { error: subscriptionError },
      })
      return NextResponse.json({ error: "Failed to check subscription" }, { status: 500 })
    }

    const planType = subscription?.plan_type || "free"

    // Get usage limits for the plan
    const { data: usageLimits, error: limitsError } = await supabase
      .from("usage_limits")
      .select("*")
      .eq("plan_type", planType)
      .single()

    if (limitsError) {
      logger.error("Error fetching usage limits", {
        context: "API",
        userId,
        data: { error: limitsError },
      })
      return NextResponse.json({ error: "Failed to check usage limits" }, { status: 500 })
    }

    // Get current usage stats
    const { data: usageStats, error: statsError } = await supabase
      .from("usage_stats")
      .select("*")
      .eq("user_id", userId)
      .order("month", { ascending: false })
      .limit(1)
      .single()

    if (statsError && statsError.code !== "PGRST116") {
      // PGRST116 is "no rows returned" which is fine for new users
      logger.error("Error fetching usage stats", {
        context: "API",
        userId,
        data: { error: statsError },
      })
      return NextResponse.json({ error: "Failed to check usage stats" }, { status: 500 })
    }

    // Check if user has reached their content generation limit
    if (
      usageLimits.monthly_content_limit !== null &&
      usageStats &&
      usageStats.content_generated >= usageLimits.monthly_content_limit
    ) {
      logger.warn("User reached content generation limit", {
        context: "API",
        userId,
        data: { limit: usageLimits.monthly_content_limit, used: usageStats.content_generated },
      })
      return NextResponse.json(
        { error: "You have reached your monthly content generation limit. Please upgrade your plan." },
        { status: 403 },
      )
    }

    // Initialize Gemini API
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })

    // Prepare the prompt based on content type and tone
    let prompt = `Enhance the following ${contentType || "content"} to make it more engaging, professional, and SEO-friendly.`

    if (tone) {
      prompt += ` Use a ${tone} tone.`
    }

    prompt += `\n\nOriginal content:\n${content}\n\nEnhanced content:`

    // Generate enhanced content
    const result = await model.generateContent(prompt)
    const enhancedContent = result.response.text()

    // Update usage stats
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM format
    if (usageStats && usageStats.month === currentMonth) {
      // Update existing stats
      await supabase
        .from("usage_stats")
        .update({
          content_generated: usageStats.content_generated + 1,
        })
        .eq("id", usageStats.id)
    } else {
      // Create new stats for this month
      await supabase.from("usage_stats").insert({
        user_id: userId,
        month: currentMonth,
        content_generated: 1,
        sentiment_analysis_used: 0,
        keyword_extraction_used: 0,
        text_summarization_used: 0,
        api_calls: 0,
      })
    }

    logger.info("Content enhanced successfully", {
      context: "API",
      userId,
      data: { contentType },
    })

    return NextResponse.json({
      enhancedContent,
    })
  } catch (error) {
    logger.error("Error enhancing content", { context: "API" }, error as Error)
    return NextResponse.json({ error: "Failed to enhance content" }, { status: 500 })
  }
}
