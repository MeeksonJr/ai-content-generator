import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { logger } from "@/lib/utils/logger"

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

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
    const { subscriptionId, token } = body

    if (!subscriptionId || !token) {
      logger.warn("Missing parameters in PayPal success API", {
        context: "API",
        userId,
      })
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Get PayPal credentials from environment variables
    const clientId = process.env.PAYPAL_CLIENT_ID
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      logger.error("Missing PayPal credentials", {
        context: "API",
        userId,
      })
      return NextResponse.json({ error: "PayPal configuration error" }, { status: 500 })
    }

    // Get access token from PayPal
    const authResponse = await fetch("https://api-m.sandbox.paypal.com/v1/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: "grant_type=client_credentials",
    })

    if (!authResponse.ok) {
      const errorText = await authResponse.text()
      logger.error("Failed to get PayPal access token", {
        context: "API",
        userId,
        data: { error: errorText },
      })
      return NextResponse.json({ error: "Failed to authenticate with PayPal" }, { status: 500 })
    }

    const authData = await authResponse.json()
    const accessToken = authData.access_token

    // Verify subscription with PayPal
    const verifyResponse = await fetch(`https://api-m.sandbox.paypal.com/v1/billing/subscriptions/${subscriptionId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!verifyResponse.ok) {
      const errorText = await verifyResponse.text()
      logger.error("Failed to verify PayPal subscription", {
        context: "API",
        userId,
        data: { error: errorText, subscriptionId },
      })
      return NextResponse.json({ error: "Failed to verify subscription" }, { status: 500 })
    }

    const subscriptionData = await verifyResponse.json()

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
    const { data: existingSubscription, error: fetchError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("payment_id", subscriptionId)
      .single()

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
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingSubscription.id)

      if (updateError) {
        logger.error("Error updating subscription in database", {
          context: "API",
          userId,
          data: { error: updateError, subscriptionId: existingSubscription.id },
        })
        return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 })
      }
    } else {
      // Create new subscription if not found
      // Extract plan type from subscription data
      const planName = subscriptionData.plan.name.toLowerCase()
      const planType = planName.includes("professional") ? "professional" : "enterprise"

      const { error: createError } = await supabase.from("subscriptions").insert({
        user_id: userId,
        plan_type: planType,
        status: "active",
        started_at: new Date().toISOString(),
        payment_id: subscriptionId,
      })

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
