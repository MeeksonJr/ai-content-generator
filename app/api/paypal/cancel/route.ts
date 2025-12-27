import { NextResponse } from "next/server"
import { cancelSubscription as cancelPayPalSubscription } from "@/lib/paypal/client"
import { logger } from "@/lib/utils/logger"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseRouteClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const reason = typeof body.reason === "string" && body.reason.trim().length > 0 ? body.reason.trim() : "User requested cancellation"

    // Fetch the user's active subscription
    const { data: subscription, error: fetchError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", session.user.id)
      .in("status", ["active", "trialing", "past_due"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (fetchError) {
      logger.error("Error fetching subscription during cancellation", { context: "PayPalCancel", data: { userId: session.user.id } }, fetchError as Error)
      return NextResponse.json({ error: "Failed to fetch subscription" }, { status: 500 })
    }

    if (!subscription) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 404 })
    }

    // If there is a PayPal subscription id (payment_id), cancel it via PayPal
    if (subscription.payment_id) {
      try {
        await cancelPayPalSubscription(subscription.payment_id, reason, session.user.id)
      } catch (error) {
        logger.error(
          "Failed to cancel PayPal subscription",
          { context: "PayPalCancel", data: { userId: session.user.id, subscriptionId: subscription.payment_id } },
          error as Error,
        )
        return NextResponse.json({ error: "Failed to cancel PayPal subscription" }, { status: 502 })
      }
    }

    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
        expires_at: new Date().toISOString(),
      })
      .eq("id", subscription.id)

    if (updateError) {
      logger.error(
        "Failed to update subscription status after cancellation",
        { context: "PayPalCancel", data: { userId: session.user.id, subscriptionId: subscription.id } },
        updateError as Error,
      )
      return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error("Unhandled error in PayPal cancel API", { context: "PayPalCancel" }, error as Error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

