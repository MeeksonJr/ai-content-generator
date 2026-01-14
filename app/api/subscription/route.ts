import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { logger } from "@/lib/utils/logger"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import type { Database } from "@/lib/database.types"
import { AuthenticationError, ValidationError, handleApiError } from "@/lib/utils/error-handler"
import { createSecureResponse, handlePreflight } from "@/lib/utils/security"
import { getOrSetCache, CacheKeys, CacheTTL, invalidateCache } from "@/lib/cache/redis"

type SubscriptionRow = Database["public"]["Tables"]["subscriptions"]["Row"]
type SubscriptionInsert = Database["public"]["Tables"]["subscriptions"]["Insert"]
type SubscriptionUpdate = Database["public"]["Tables"]["subscriptions"]["Update"]

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

export async function GET(request: NextRequest) {
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
      logger.warn("Unauthorized access attempt to subscription API", {
        context: "API",
        data: { path: "/api/subscription" },
      })
      const { statusCode, error } = handleApiError(new AuthenticationError(), "Subscription GET")
      return createSecureResponse(error, statusCode)
    }

    const userId = session.user.id

    // Get cached subscription data or fetch fresh (with 2 minute TTL)
    const subscriptionData = await getOrSetCache(
      CacheKeys.subscription(userId),
      async () => {
        // Get user's subscription
        const { data: subscription, error: subscriptionError } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (subscriptionError && subscriptionError.code !== "PGRST116") {
          // PGRST116 is "no rows returned" which is fine - user just doesn't have a subscription yet
          logger.error("Error fetching subscription", {
            context: "API",
            userId,
            data: { error: subscriptionError },
          })
          throw new Error("Failed to fetch subscription")
        }

        // Default to free plan if no subscription exists
        const subData = subscription as SubscriptionRow | null
        const planType = subData?.plan_type || "free"

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

        return {
          subscription: subData || {
            plan_type: "free",
            status: "active",
            started_at: new Date().toISOString(),
          },
          usageLimits: planLimits,
          usageStats: usageStats || defaultStats,
        }
      },
      CacheTTL.SHORT // Cache for 2 minutes (short TTL for user-specific data)
    )

      logger.info("Successfully fetched subscription data", {
        context: "API",
        userId,
        data: {
          planType: subscriptionData.subscription.plan_type,
          status: subscriptionData.subscription.status,
          limitsFound: !!subscriptionData.usageLimits,
          statsFound: !!subscriptionData.usageStats,
        },
      })

      return createSecureResponse(subscriptionData)
  } catch (error) {
    logger.error("Error in subscription API", { context: "API" }, error as Error)
    return createSecureResponse({ error: "Internal server error" }, 500)
  }
}

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
      logger.warn("Unauthorized access attempt to subscription API", {
        context: "API",
        data: { path: "/api/subscription" },
      })
      const { statusCode, error } = handleApiError(new AuthenticationError(), "Subscription POST")
      return createSecureResponse(error, statusCode)
    }

    const userId = session.user.id

    // Get request body
    const body = await request.json()
    const { planType } = body

    // Validate planType
    const validPlanTypes = ["free", "basic", "professional", "enterprise"]
    if (!planType || !validPlanTypes.includes(planType)) {
      logger.warn("Invalid planType in subscription API", {
        context: "API",
        userId,
      })
      const { statusCode, error } = handleApiError(
        new ValidationError(`Plan type must be one of: ${validPlanTypes.join(", ")}`),
        "Subscription POST"
      )
      return createSecureResponse(error, statusCode)
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
      return createSecureResponse({ error: "Failed to check existing subscription" }, 500)
    }

    // If user has an active subscription, update it
    const existingSubscriptionData = existingSubscription as SubscriptionRow | null
    if (existingSubscriptionData && existingSubscriptionData.status === "active") {
      const updateData: SubscriptionUpdate = {
        plan_type: planType,
        updated_at: new Date().toISOString(),
      }
      
      const { error: updateError } = await supabase
        .from("subscriptions")
        // @ts-ignore - Known Supabase type inference issue with update operations
        .update(updateData)
        .eq("id", existingSubscriptionData.id)

      if (updateError) {
        logger.error("Error updating subscription", {
          context: "API",
          userId,
          data: { error: updateError, subscriptionId: existingSubscriptionData.id },
        })
        return createSecureResponse({ error: "Failed to update subscription" }, 500)
      }

      logger.info("Successfully updated subscription", {
        context: "API",
        userId,
        data: { planType, subscriptionId: existingSubscriptionData.id },
      })

      // Fetch updated subscription
      const { data: updatedSubscription } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("id", existingSubscriptionData.id)
        .single()

      const updatedSubscriptionData = updatedSubscription as SubscriptionRow | null

      // Invalidate subscription cache for this user
      await invalidateCache(CacheKeys.subscription(userId))

      return createSecureResponse({
        success: true,
        message: "Subscription updated successfully",
        subscription: updatedSubscriptionData || {
          ...existingSubscriptionData,
          plan_type: planType,
        },
      })
    }

    // Otherwise, create a new subscription
    const insertData: SubscriptionInsert = {
      user_id: userId,
      plan_type: planType,
      status: "active",
      started_at: new Date().toISOString(),
    }
    
    const { data: newSubscription, error: createError } = await supabase
      .from("subscriptions")
      // @ts-ignore - Known Supabase type inference issue with insert operations
      .insert(insertData)
      .select()
      .single()

    if (createError) {
      logger.error("Error creating subscription", {
        context: "API",
        userId,
        data: { error: createError, planType },
      })
      return createSecureResponse({ error: "Failed to create subscription" }, 500)
    }

    const newSubscriptionData = newSubscription as SubscriptionRow

    // Invalidate subscription cache for this user
    await invalidateCache(CacheKeys.subscription(userId))

    logger.info("Successfully created subscription", {
      context: "API",
      userId,
      data: { planType, subscriptionId: newSubscriptionData.id },
    })

    return createSecureResponse({
      success: true,
      message: "Subscription created successfully",
      subscription: newSubscriptionData,
    })
  } catch (error) {
    logger.error("Error in subscription API", { context: "API" }, error as Error)
    return createSecureResponse({ error: "Internal server error" }, 500)
  }
}
