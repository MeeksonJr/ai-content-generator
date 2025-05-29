import { createServerClient } from "@/lib/supabase/server"
import { logger } from "@/lib/utils/logger"

interface SubscriptionStatus {
  isActive: boolean
  plan: "free" | "basic" | "professional" | "enterprise"
  usageLimit: number
  currentUsage: number
  canGenerate: boolean
}

export async function checkSubscription(userId: string): Promise<SubscriptionStatus> {
  try {
    const supabase = createServerClient()

    // Get user's subscription
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .single()

    if (subError && subError.code !== "PGRST116") {
      logger.error("Error fetching subscription", {
        context: "Subscription",
        data: { error: subError.message, userId },
      })
    }

    // Get usage stats
    const { data: usage, error: usageError } = await supabase
      .from("usage_stats")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (usageError && usageError.code !== "PGRST116") {
      logger.error("Error fetching usage stats", {
        context: "Subscription",
        data: { error: usageError.message, userId },
      })
    }

    // Default to free plan if no subscription
    const plan = subscription?.plan_type || "free"
    const currentUsage = usage?.content_generated || 0

    // Define usage limits based on plan
    const usageLimits = {
      free: 10,
      basic: 100,
      professional: 1000,
      enterprise: 10000,
    }

    const usageLimit = usageLimits[plan as keyof typeof usageLimits] || usageLimits.free
    const canGenerate = currentUsage < usageLimit
    const isActive = subscription ? subscription.status === "active" : plan === "free"

    logger.info("Checked subscription status", {
      context: "Subscription",
      data: { userId, plan, currentUsage, usageLimit, canGenerate },
    })

    return {
      isActive,
      plan: plan as "free" | "basic" | "professional" | "enterprise",
      usageLimit,
      currentUsage,
      canGenerate,
    }
  } catch (error) {
    logger.error("Subscription check error", {
      context: "Subscription",
      data: { error: error instanceof Error ? error.message : "Unknown error", userId },
    })

    // Return free plan as fallback
    return {
      isActive: true,
      plan: "free",
      usageLimit: 10,
      currentUsage: 0,
      canGenerate: true,
    }
  }
}
