import { NextResponse } from "next/server"
import { logger } from "@/lib/utils/logger"
import { getSubscription } from "@/lib/paypal/client"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseRouteClient()

    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      logger.warn("Unauthorized access attempt to PayPal success API", {
        context: "API",
        data: { path: "/api/paypal/subscription-success" },
      })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Get request body
    const body = await request.json()
    const { subscriptionId, revisionId, isRevision } = body

    if (!subscriptionId) {
      logger.warn("Missing parameters in PayPal success API", {
        context: "API",
        userId,
      })
      return NextResponse.json({ error: "Missing subscription ID" }, { status: 400 })
    }
    // Verify subscription using centralized PayPal client (handles env + sandbox/prod)
    let subscriptionData
    try {
      subscriptionData = await getSubscription(subscriptionId)
    } catch (error) {
      logger.error(
        "Failed to verify PayPal subscription",
        {
          context: "API",
          userId,
          data: { subscriptionId },
        },
        error as Error,
      )
      return NextResponse.json({ error: "Failed to verify subscription" }, { status: 500 })
    }

    // Check if subscription is active
    if (subscriptionData.status !== "ACTIVE" && subscriptionData.status !== "APPROVED") {
      logger.warn("PayPal subscription not active", {
        context: "API",
        userId,
        data: { subscriptionId, status: subscriptionData.status },
      })
      return NextResponse.json({ error: "Subscription is not active" }, { status: 400 })
    }

    // Update subscription in database
    // Try to find by paypal_subscription_id first, then payment_id
    const { data: existingSubscription, error: fetchError } = await supabase
      .from("subscriptions")
      .select("*")
      .or(`paypal_subscription_id.eq.${subscriptionId},payment_id.eq.${subscriptionId}`)
      .maybeSingle()

    if (fetchError && fetchError.code !== "PGRST116") {
      logger.error("Error fetching subscription from database", {
        context: "API",
        userId,
        data: { error: fetchError, subscriptionId },
      })
      return NextResponse.json({ error: "Failed to fetch subscription" }, { status: 500 })
    }

    if (existingSubscription) {
      // Update existing subscription
      // Use server client for database operations to bypass RLS if needed
      const { createServerSupabaseClient } = await import("@/lib/supabase/server-client")
      const serverSupabase = createServerSupabaseClient()
      
      const existingSub = existingSubscription as any
      
      // @ts-expect-error - Known Supabase type inference issue with update operations
      const { error: updateError } = await serverSupabase
        .from("subscriptions")
        .update({
          status: "active",
          updated_at: new Date().toISOString(),
          ...(revisionId && { paypal_subscription_id: subscriptionId }),
        } as any)
        .eq("id", existingSub.id)

      if (updateError) {
        logger.error("Error updating subscription in database", {
          context: "API",
          data: { userId, subscriptionId: existingSub.id },
        }, updateError as Error)
        return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 })
      }
    } else {
      // Create new subscription if not found
      // Extract plan type from subscription data
      const planName = subscriptionData?.plan?.name?.toLowerCase?.() ?? ""
      const planType = planName.includes("professional") ? "professional" : "enterprise"

      // Use server client for database operations
      const { createServerSupabaseClient } = await import("@/lib/supabase/server-client")
      const serverSupabase = createServerSupabaseClient()
      
      // @ts-ignore - Known Supabase type inference issue
      const { error: createError } = await serverSupabase.from("subscriptions").insert({
        user_id: userId,
        plan_type: planType,
        status: "active",
        started_at: new Date().toISOString(),
        payment_id: subscriptionId,
        paypal_subscription_id: subscriptionId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)

      if (createError) {
        logger.error("Error creating subscription in database", {
          context: "API",
          userId,
          data: { error: createError, subscriptionId },
        })
        return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 })
      }
    }

    logger.info("Successfully activated PayPal subscription", {
      context: "API",
      userId,
      data: { subscriptionId },
    })

    return NextResponse.json({
      success: true,
      message: "Subscription activated successfully",
    })
  } catch (error) {
    logger.error("Error in PayPal success API", { context: "API" }, error as Error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
