import { NextResponse } from "next/server"
import { logger } from "@/lib/utils/logger"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"

// Default usage limits for different plan types
const DEFAULT_USAGE_LIMITS = {
  free: {
    monthly_content_limit: 5,
    max_content_length: 1000,
    sentiment_analysis_enabled: false,
    keyword_extraction_enabled: false,
    text_summarization_enabled: false,
    api_access_enabled: false,
  },
  basic: {
    monthly_content_limit: 20,
    max_content_length: 3000,
    sentiment_analysis_enabled: true,
    keyword_extraction_enabled: true,
    text_summarization_enabled: false,
    api_access_enabled: false,
  },
  professional: {
    monthly_content_limit: 100,
    max_content_length: 10000,
    sentiment_analysis_enabled: true,
    keyword_extraction_enabled: true,
    text_summarization_enabled: true,
    api_access_enabled: true,
  },
  enterprise: {
    monthly_content_limit: -1, // Unlimited
    max_content_length: 50000,
    sentiment_analysis_enabled: true,
    keyword_extraction_enabled: true,
    text_summarization_enabled: true,
    api_access_enabled: true,
  },
}

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseRouteClient()

    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      logger.warn("Unauthorized access attempt to subscription API", {
        context: "API",
        data: { path: "/api/subscription" },
      })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Get user's subscription
    const { data: subscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (subscriptionError && subscriptionError.code !== "PGRST116") {
      // PGRST116 is "no rows returned" which is fine - user just doesn't have a subscription yet
      logger.error("Error fetching subscription", {
        context: "API",
        userId,
        data: { error: subscriptionError },
      })
      return NextResponse.json({ error: "Failed to fetch subscription" }, { status: 500 })
    }

    // Default to free plan if no subscription exists
    const planType = subscription?.plan_type || "free"

    // Get usage limits for the subscription plan
    const { data: usageLimits, error: limitsError } = await supabase
      .from("usage_limits")
      .select("*")
      .eq("plan_type", planType)
      .maybeSingle() // Use maybeSingle instead of single to avoid errors when no rows are found

    // If no usage limits found in the database, use default values
    const planLimits =
      usageLimits || DEFAULT_USAGE_LIMITS[planType as keyof typeof DEFAULT_USAGE_LIMITS] || DEFAULT_USAGE_LIMITS.free

    if (limitsError && limitsError.code !== "PGRST116") {
      logger.error("Error fetching usage limits", {
        context: "API",
        userId,
        data: { error: limitsError, planType },
      })
      // Continue with default limits instead of returning an error
    }

    // Get current month's usage stats
    const currentDate = new Date()
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-01`

    const { data: usageStats, error: usageError } = await supabase
      .from("usage_stats")
      .select("*")
      .eq("user_id", userId)
      .eq("month", currentMonth)
      .maybeSingle() // Use maybeSingle instead of single

    if (usageError && usageError.code !== "PGRST116") {
      logger.error("Error fetching usage stats", {
        context: "API",
        userId,
        data: { error: usageError },
      })
      // Continue with default stats instead of returning an error
    }

    // Default usage stats if none found
    const defaultStats = {
      content_generated: 0,
      sentiment_analysis_used: 0,
      keyword_extraction_used: 0,
      text_summarization_used: 0,
      api_calls: 0,
    }

    logger.info("Successfully fetched subscription data", {
      context: "API",
      userId,
      data: {
        planType,
        status: subscription?.status || "free",
        limitsFound: !!usageLimits,
        statsFound: !!usageStats,
      },
    })

    return NextResponse.json({
      subscription: subscription || {
        plan_type: "free",
        status: "active",
        started_at: new Date().toISOString(),
      },
      usageLimits: planLimits,
      usageStats: usageStats || defaultStats,
    })
  } catch (error) {
    logger.error("Error in subscription API", { context: "API" }, error as Error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseRouteClient()

    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      logger.warn("Unauthorized access attempt to subscription API", {
        context: "API",
        data: { path: "/api/subscription" },
      })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Get request body
    const body = await request.json()
    const { planType } = body

    if (!planType) {
      logger.warn("Missing planType in subscription API", {
        context: "API",
        userId,
      })
      return NextResponse.json({ error: "Missing required planType parameter" }, { status: 400 })
    }

    // Check if user already has a subscription
    const { data: existingSubscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle() // Use maybeSingle instead of single

    if (subscriptionError && subscriptionError.code !== "PGRST116") {
      logger.error("Error fetching existing subscription", {
        context: "API",
        userId,
        data: { error: subscriptionError },
      })
      return NextResponse.json({ error: "Failed to check existing subscription" }, { status: 500 })
    }

    // If user has an active subscription, update it
    if (existingSubscription && existingSubscription.status === "active") {
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          plan_type: planType,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingSubscription.id)

      if (updateError) {
        logger.error("Error updating subscription", {
          context: "API",
          userId,
          data: { error: updateError, subscriptionId: existingSubscription.id },
        })
        return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 })
      }

      logger.info("Successfully updated subscription", {
        context: "API",
        userId,
        data: { planType, subscriptionId: existingSubscription.id },
      })

      return NextResponse.json({
        success: true,
        message: "Subscription updated successfully",
        subscription: {
          ...existingSubscription,
          plan_type: planType,
        },
      })
    }

    // Otherwise, create a new subscription
    const { data: newSubscription, error: createError } = await supabase
      .from("subscriptions")
      .insert({
        user_id: userId,
        plan_type: planType,
        status: "active",
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (createError) {
      logger.error("Error creating subscription", {
        context: "API",
        userId,
        data: { error: createError, planType },
      })
      return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 })
    }

    logger.info("Successfully created subscription", {
      context: "API",
      userId,
      data: { planType, subscriptionId: newSubscription.id },
    })

    return NextResponse.json({
      success: true,
      message: "Subscription created successfully",
      subscription: newSubscription,
    })
  } catch (error) {
    logger.error("Error in subscription API", { context: "API" }, error as Error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
