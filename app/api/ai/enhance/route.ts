import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import type { Database } from "@/lib/database.types"
import { getDefaultUsageLimits } from "@/lib/constants/usage-limits"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { logger } from "@/lib/utils/logger"

type SubscriptionRow = Database["public"]["Tables"]["subscriptions"]["Row"]
type UsageLimitsRow = Database["public"]["Tables"]["usage_limits"]["Row"]
type UsageStatsRow = Database["public"]["Tables"]["usage_stats"]["Row"]

const getCurrentMonth = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseRouteClient()

    // Check if user is authenticated
    const sessionResult = await supabase.auth.getSession()
    const session = sessionResult.data.session

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
    const subscriptionResponse = await supabase
      .from("subscriptions")
      .select("plan_type")
      .eq("user_id", userId)
      .maybeSingle()

    if (subscriptionResponse.error && subscriptionResponse.error.code !== "PGRST116") {
      // PGRST116 is "no rows returned" which is fine for new users
      logger.error("Error fetching subscription", {
        context: "API",
        userId,
        data: { error: subscriptionResponse.error },
      })
      return NextResponse.json({ error: "Failed to check subscription" }, { status: 500 })
    }

    const subscriptionData = subscriptionResponse.data as Pick<SubscriptionRow, "plan_type"> | null
    const planType = subscriptionData?.plan_type || "free"

    // Get usage limits for the plan
    const usageLimitsResponse = await supabase
      .from("usage_limits")
      .select("*")
      .eq("plan_type", planType)
      .maybeSingle()

    if (usageLimitsResponse.error && usageLimitsResponse.error.code !== "PGRST116") {
      logger.error("Error fetching usage limits", {
        context: "API",
        userId,
        data: { error: usageLimitsResponse.error },
      })
      return NextResponse.json({ error: "Failed to check usage limits" }, { status: 500 })
    }

    const usageLimits = (usageLimitsResponse.data as UsageLimitsRow | null) || getDefaultUsageLimits(planType)

    // Get current usage stats
    const currentMonth = getCurrentMonth()

    const usageStatsResponse = await supabase
      .from("usage_stats")
      .select("*")
      .eq("user_id", userId)
      .eq("month", currentMonth)
      .maybeSingle()

    if (usageStatsResponse.error && usageStatsResponse.error.code !== "PGRST116") {
      // PGRST116 is "no rows returned" which is fine for new users
      logger.error("Error fetching usage stats", {
        context: "API",
        userId,
        data: { error: usageStatsResponse.error },
      })
      return NextResponse.json({ error: "Failed to check usage stats" }, { status: 500 })
    }

    const usageStats = usageStatsResponse.data as UsageStatsRow | null

    // Check if user has reached their content generation limit
    if (
      usageLimits.monthly_content_limit !== null &&
      usageStats &&
      usageLimits.monthly_content_limit !== -1 &&
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
    if (usageStats) {
      // Update existing stats
      await supabase
        .from("usage_stats")
        .update({
          content_generated: usageStats.content_generated + 1,
          updated_at: new Date().toISOString(),
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
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
