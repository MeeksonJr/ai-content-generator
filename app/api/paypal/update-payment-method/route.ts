import { NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/utils/logger"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { reviseSubscription } from "@/lib/paypal/client"
import { handleApiError, AuthenticationError, ValidationError, NotFoundError } from "@/lib/utils/error-handler"
import type { Database } from "@/lib/database.types"

type SubscriptionRow = Database["public"]["Tables"]["subscriptions"]["Row"]

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteClient()

    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      const { statusCode, error } = handleApiError(new AuthenticationError(), "Update Payment Method")
      return NextResponse.json(error, { status: statusCode })
    }

    const userId = session.user.id

    // Get user's subscription
    const { data: subscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (subscriptionError && subscriptionError.code !== "PGRST116") {
      const { statusCode, error } = handleApiError(subscriptionError, "Update Payment Method")
      return NextResponse.json(error, { status: statusCode })
    }

    if (!subscription) {
      const { statusCode, error } = handleApiError(
        new NotFoundError("No active subscription found"),
        "Update Payment Method"
      )
      return NextResponse.json(error, { status: statusCode })
    }

    const sub = subscription as SubscriptionRow
    const paypalSubscriptionId = sub.paypal_subscription_id

    if (!paypalSubscriptionId) {
      const { statusCode, error } = handleApiError(
        new ValidationError("Subscription is not linked to PayPal"),
        "Update Payment Method"
      )
      return NextResponse.json(error, { status: statusCode })
    }

    // Revise subscription to update payment method
    logger.info("Initiating payment method update", {
      context: "Update Payment Method",
      userId,
      data: { subscriptionId: sub.id, paypalSubscriptionId },
    })

    const revision = await reviseSubscription(
      paypalSubscriptionId,
      {
        updatePaymentMethod: true,
      },
      userId
    )

    // Find the approval URL
    const approvalUrl = revision.links?.find((link: any) => link.rel === "approve")?.href

    if (!approvalUrl) {
      logger.error("Approval URL not found in PayPal revision response", {
        context: "Update Payment Method",
        userId,
        data: { subscriptionId: sub.id, revisionId: revision.id, links: revision.links },
      })
      const { statusCode, error } = handleApiError(
        new Error("Approval URL not found in PayPal response"),
        "Update Payment Method"
      )
      return NextResponse.json(error, { status: statusCode })
    }

    logger.info("Payment method update initiated successfully", {
      context: "Update Payment Method",
      userId,
      data: { subscriptionId: sub.id, revisionId: revision.id },
    })

    return NextResponse.json({
      success: true,
      approvalUrl,
      revisionId: revision.id,
    })
  } catch (error) {
    logger.error("Error updating payment method", { context: "Update Payment Method" }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Update Payment Method")
    return NextResponse.json(apiError, { status: statusCode })
  }
}

