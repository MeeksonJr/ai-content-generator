import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { analyzeSentiment } from "@/lib/ai/huggingface-client"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { checkRateLimit, getRateLimitHeaders } from "@/lib/utils/rate-limiter"
import { handleApiError, RateLimitError, AuthenticationError, ValidationError } from "@/lib/utils/error-handler"
import { validateText } from "@/lib/utils/validation"
import { createSecureResponse, handlePreflight } from "@/lib/utils/security"
import { API_CONFIG } from "@/lib/constants/app.constants"
import { logger } from "@/lib/utils/logger"

export async function POST(request: NextRequest) {
  try {
    // Handle preflight OPTIONS request
    const preflightResponse = handlePreflight(request)
    if (preflightResponse) return preflightResponse

    const supabase = await createSupabaseRouteClient()

    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      const { statusCode, error } = handleApiError(new AuthenticationError(), "Sentiment Analysis POST")
      return createSecureResponse(error, statusCode)
    }

    // Get request body
    const body = await request.json()
    const { text } = body

    // Validate text
    const textValidation = validateText(text, {
      minLength: 1,
      maxLength: API_CONFIG.MAX_CONTENT_LENGTH,
      required: true,
    })

    if (!textValidation.isValid) {
      const { statusCode, error } = handleApiError(
        new ValidationError(`Text: ${textValidation.error}`),
        "Sentiment Analysis POST"
      )
      return createSecureResponse(error, statusCode)
    }

    // Check user's subscription and usage limits
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan_type, status")
      .eq("user_id", session.user.id)
      .maybeSingle()

    const subscriptionData = subscription as { plan_type?: string; status?: string } | null

    if (!subscriptionData || subscriptionData.status !== "active") {
      const { statusCode, error } = handleApiError(
        new ValidationError("No active subscription"),
        "Sentiment Analysis POST"
      )
      return createSecureResponse(error, statusCode)
    }

    // Get usage limits for the user's plan
    const planType = subscriptionData.plan_type || "free"
    const { data: usageLimits } = await supabase
      .from("usage_limits")
      .select("sentiment_analysis_enabled")
      .eq("plan_type", planType)
      .maybeSingle()

    const limitsData = usageLimits as { sentiment_analysis_enabled?: boolean } | null

    if (!limitsData) {
      const { statusCode, error } = handleApiError(
        new ValidationError("Could not determine usage limits"),
        "Sentiment Analysis POST"
      )
      return createSecureResponse(error, statusCode)
    }

    // Check if sentiment analysis is enabled for this plan
    if (!limitsData.sentiment_analysis_enabled) {
      const { statusCode, error } = handleApiError(
        new ValidationError("Sentiment analysis not available on your current plan"),
        "Sentiment Analysis POST"
      )
      return createSecureResponse(error, statusCode)
    }

    // Check rate limits (time-based throttling)
    let rateLimitHeaders: Record<string, string> = {}
    try {
      const minuteLimit = await checkRateLimit(session.user.id, planType, undefined, "minute")
      const hourLimit = await checkRateLimit(session.user.id, planType, undefined, "hour")
      
      rateLimitHeaders = {
        ...getRateLimitHeaders(minuteLimit),
        "X-RateLimit-Hourly-Limit": hourLimit.limit.toString(),
        "X-RateLimit-Hourly-Remaining": hourLimit.remaining.toString(),
        "X-RateLimit-Hourly-Reset": hourLimit.resetAt.toString(),
      }
    } catch (error) {
      if (error instanceof RateLimitError) {
        const { statusCode, error: apiError } = handleApiError(error, "Sentiment Analysis Rate Limit")
        return NextResponse.json(apiError, { 
          status: statusCode,
          headers: { "Retry-After": "60" },
        })
      }
      logger.error("Rate limit check error", {
        context: "SentimentAnalysis",
        data: { userId: session.user.id },
      }, error as Error)
    }

    // Analyze sentiment
    const result = await analyzeSentiment(text)

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to analyze sentiment" }, { status: 500 })
    }

    // Update usage statistics
    const currentDate = new Date()
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-01`

    const { data: usageStats } = await supabase
      .from("usage_stats")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("month", currentMonth)
      .maybeSingle()

    if (usageStats) {
      const statsData = usageStats as { id: string; sentiment_analysis_used?: number }
      await (supabase as any)
        .from("usage_stats")
        .update({
          sentiment_analysis_used: (statsData.sentiment_analysis_used || 0) + 1,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", statsData.id)
    } else {
      await (supabase as any).from("usage_stats").insert({
        user_id: session.user.id,
        content_generated: 0,
        sentiment_analysis_used: 1,
        keyword_extraction_used: 0,
        text_summarization_used: 0,
        api_calls: 0,
        month: currentMonth,
      } as any)
    }

    // Return the sentiment analysis result with rate limit headers
    const response = createSecureResponse({
      sentiment: result.sentiment,
      score: result.score,
    })
    // Add rate limit headers
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    return response
  } catch (error) {
    logger.error("Error in sentiment analysis API", {
      context: "SentimentAnalysis",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Sentiment Analysis")
    return createSecureResponse(apiError, statusCode)
  }
}
