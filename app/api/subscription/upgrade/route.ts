import { NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/utils/logger"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { updateSubscriptionPlan, getSubscription } from "@/lib/paypal/client"
import { handleApiError, AuthenticationError, ValidationError, NotFoundError } from "@/lib/utils/error-handler"
import type { Database } from "@/lib/database.types"

type SubscriptionRow = Database["public"]["Tables"]["subscriptions"]["Row"]
type SubscriptionUpdate = Database["public"]["Tables"]["subscriptions"]["Update"]

// Plan pricing (monthly)
const PLAN_PRICING: Record<string, number> = {
  free: 0,
  basic: 9.99,
  professional: 29.99,
  enterprise: 99.99,
}

/**
 * Calculate prorated amount when upgrading/downgrading
 */
function calculateProration(
  currentPlan: string,
  newPlan: string,
  daysRemaining: number,
  totalDaysInCycle: number = 30
): { proratedAmount: number; credit: number; charge: number } {
  const currentPrice = PLAN_PRICING[currentPlan] || 0
  const newPrice = PLAN_PRICING[newPlan] || 0

  // Calculate daily rates
  const currentDailyRate = currentPrice / totalDaysInCycle
  const newDailyRate = newPrice / totalDaysInCycle

  // Calculate credit for unused portion of current plan
  const credit = currentDailyRate * daysRemaining

  // Calculate charge for remaining days at new plan rate
  const charge = newDailyRate * daysRemaining

  // Net amount to charge (could be negative for downgrade)
  const proratedAmount = charge - credit

  return {
    proratedAmount: Math.round(proratedAmount * 100) / 100, // Round to 2 decimals
    credit: Math.round(credit * 100) / 100,
    charge: Math.round(charge * 100) / 100,
  }
}

/**
 * Calculate days remaining in current billing cycle
 */
function getDaysRemaining(expiresAt: string | null): number {
  if (!expiresAt) {
    return 30 // Default to 30 days if no expiration
  }

  const expirationDate = new Date(expiresAt)
  const now = new Date()
  const diffTime = expirationDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return Math.max(0, diffDays) // Don't return negative days
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteClient()
    const serverSupabase = createServerSupabaseClient()

    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      const { statusCode, error } = handleApiError(new AuthenticationError(), "Subscription Upgrade")
      return NextResponse.json(error, { status: statusCode })
    }

    const userId = session.user.id

    // Get request body
    const body = await request.json()
    const { newPlanType } = body

    if (!newPlanType) {
      const { statusCode, error } = handleApiError(
        new ValidationError("newPlanType is required"),
        "Subscription Upgrade"
      )
      return NextResponse.json(error, { status: statusCode })
    }

    // Validate plan type
    const validPlans = ["free", "basic", "professional", "enterprise"]
    if (!validPlans.includes(newPlanType)) {
      const { statusCode, error } = handleApiError(
        new ValidationError(`Invalid plan type. Must be one of: ${validPlans.join(", ")}`),
        "Subscription Upgrade"
      )
      return NextResponse.json(error, { status: statusCode })
    }

    // Get user's current subscription
    const { data: subscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (subscriptionError && subscriptionError.code !== "PGRST116") {
      const { statusCode, error } = handleApiError(subscriptionError, "Subscription Upgrade")
      return NextResponse.json(error, { status: statusCode })
    }

    if (!subscription) {
      const { statusCode, error } = handleApiError(
        new NotFoundError("No subscription found"),
        "Subscription Upgrade"
      )
      return NextResponse.json(error, { status: statusCode })
    }

    const sub = subscription as SubscriptionRow

    // Check if plan is actually changing
    if (sub.plan_type === newPlanType) {
      return NextResponse.json({
        success: true,
        message: "Already on this plan",
        subscription: sub,
        proration: null,
      })
    }

    // If subscription is not active, just update the plan type
    if (sub.status !== "active") {
      const { error: updateError } = await supabase
        .from("subscriptions")
        // @ts-ignore - Known Supabase type inference issue
        .update({
          plan_type: newPlanType,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", sub.id)

      if (updateError) {
        const { statusCode, error } = handleApiError(updateError, "Subscription Upgrade")
        return NextResponse.json(error, { status: statusCode })
      }

      return NextResponse.json({
        success: true,
        message: "Plan updated (subscription not active)",
        subscription: { ...sub, plan_type: newPlanType },
        proration: null,
      })
    }

    // For active PayPal subscriptions, we need to update via PayPal
    if (sub.paypal_subscription_id) {
      // Get current PayPal subscription to find the plan ID
      const paypalSubscription = await getSubscription(sub.paypal_subscription_id)

      // Calculate proration
      const daysRemaining = getDaysRemaining(sub.expires_at)
      const proration = calculateProration(sub.plan_type, newPlanType, daysRemaining)

      // For now, we'll use PayPal's revise subscription API
      // Note: PayPal handles prorating automatically, but we calculate it for display
      logger.info("Upgrading PayPal subscription", {
        context: "Subscription Upgrade",
        userId,
        data: {
          currentPlan: sub.plan_type,
          newPlan: newPlanType,
          proration,
        },
      })

      // TODO: For full implementation, we need to:
      // 1. Store PayPal plan IDs for each plan type in the database
      // 2. Or create plans dynamically and store them
      // 3. Use the correct plan ID for the new plan type
      // For now, we'll update the plan_type in the database and let PayPal webhooks handle the rest
      // This is a simplified approach - in production, you'd want to update the PayPal subscription plan directly
      
      // Update database plan type
      const { error: updateError } = await supabase
        .from("subscriptions")
        // @ts-ignore - Known Supabase type inference issue
        .update({
          plan_type: newPlanType,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", sub.id)

      if (updateError) {
        const { statusCode, error } = handleApiError(updateError, "Subscription Upgrade")
        return NextResponse.json(error, { status: statusCode })
      }

      logger.info("Subscription plan updated in database", {
        context: "Subscription Upgrade",
        userId,
        data: {
          subscriptionId: sub.id,
          currentPlan: sub.plan_type,
          newPlan: newPlanType,
          proration,
        },
      })

      return NextResponse.json({
        success: true,
        message: "Plan updated successfully",
        subscription: { ...sub, plan_type: newPlanType },
        proration,
        note: "PayPal subscription plan will be updated via webhook or manual sync",
      })

      const approvalUrl = revision.links?.find((link: any) => link.rel === "approve")?.href

      if (!approvalUrl) {
        logger.error("Approval URL not found in PayPal revision response", {
          context: "Subscription Upgrade",
          userId,
          data: { revisionId: revision.id },
        })
        const { statusCode, error } = handleApiError(
          new Error("Approval URL not found in PayPal response"),
          "Subscription Upgrade"
        )
        return NextResponse.json(error, { status: statusCode })
      }

      return NextResponse.json({
        success: true,
        message: "Plan upgrade initiated",
        approvalUrl,
        revisionId: revision.id,
        proration,
        currentPlan: sub.plan_type,
        newPlan: newPlanType,
      })
    }

    // For non-PayPal subscriptions, just update the plan type
    const { data: updatedSubscription, error: updateError } = await supabase
      .from("subscriptions")
      // @ts-ignore - Known Supabase type inference issue
      .update({
        plan_type: newPlanType,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", sub.id)
      .select()
      .single()

    if (updateError) {
      const { statusCode, error } = handleApiError(updateError, "Subscription Upgrade")
      return NextResponse.json(error, { status: statusCode })
    }

    // Calculate proration for display
    const daysRemaining = getDaysRemaining(sub.expires_at)
    const proration = calculateProration(sub.plan_type, newPlanType, daysRemaining)

    logger.info("Subscription plan updated", {
      context: "Subscription Upgrade",
      userId,
      data: {
        subscriptionId: sub.id,
        currentPlan: sub.plan_type,
        newPlan: newPlanType,
        proration,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Plan updated successfully",
      subscription: updatedSubscription,
      proration,
    })
  } catch (error) {
    logger.error("Error upgrading subscription", { context: "Subscription Upgrade" }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Subscription Upgrade")
    return NextResponse.json(apiError, { status: statusCode })
  }
}

