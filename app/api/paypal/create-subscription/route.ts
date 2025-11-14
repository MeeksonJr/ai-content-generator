import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import * as paypalClient from "@/lib/paypal/client"
import { logger } from "@/lib/utils/logger"

// Enable test mode for development/testing without actual PayPal calls
const TEST_MODE = process.env.NODE_ENV !== "production" && process.env.PAYPAL_TEST_MODE === "true"

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the plan from the request
    const body = await request.json().catch(() => ({}))
    const planType = body.planType

    if (!planType || !["professional", "enterprise"].includes(planType)) {
      return NextResponse.json({ error: "Invalid plan type" }, { status: 400 })
    }

    // Define plan details based on the selected plan
    let planName, planDescription, planAmount

    if (planType === "professional") {
      planName = "Professional Plan"
      planDescription = "Advanced features for professionals"
      planAmount = 19.99
    } else if (planType === "enterprise") {
      planName = "Enterprise Plan"
      planDescription = "Maximum features for businesses"
      planAmount = 49.99
    } else {
      return NextResponse.json({ error: "Invalid plan type" }, { status: 400 })
    }

    // For testing without PayPal
    if (TEST_MODE) {
      logger.info("Using TEST MODE for PayPal subscription", {
        userId: user.id,
        planType,
      })

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

      // Store the test subscription in the database
      const testSubscriptionId = `TEST_SUB_${Date.now()}`
      const testPlanId = `TEST_PLAN_${Date.now()}`

      const { error: subscriptionError } = await supabase
        .from("subscriptions")
        .upsert(
          {
            user_id: user.id,
            plan_type: planType,
            paypal_subscription_id: testSubscriptionId,
            paypal_plan_id: testPlanId,
            payment_id: testSubscriptionId,
            status: "pending",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        )

      if (subscriptionError) {
        logger.error("Failed to store test subscription in database", {
          userId: user.id,
          error: subscriptionError,
        })
        return NextResponse.json({ error: "Failed to store subscription" }, { status: 500 })
      }

      // Return a test approval URL
      return NextResponse.json({
        subscriptionId: testSubscriptionId,
        approvalUrl: `${appUrl}/dashboard/subscription/success?subscription_id=${testSubscriptionId}&plan=${planType}`,
      })
    }

    // Create a subscription plan in PayPal
    try {
      logger.info("Creating PayPal subscription plan", {
        userId: user.id,
        planType,
        planDetails: { planName, planDescription, planAmount },
      })

      const plan = await paypalClient.createSubscriptionPlan({
        name: planName,
        description: planDescription,
        amount: planAmount,
        interval: "MONTH",
      })

      // Create a subscription
      logger.info("Creating PayPal subscription", {
        userId: user.id,
        planId: plan.id,
      })

      const subscription = await paypalClient.createSubscription(plan.id, user.id)

      // Find the approval URL
      const approvalUrl = subscription.links.find((link: any) => link.rel === "approve")?.href

      if (!approvalUrl) {
        logger.error("Approval URL not found in PayPal response", {
          userId: user.id,
          subscriptionId: subscription.id,
          links: subscription.links,
        })
        throw new Error("Approval URL not found in PayPal response")
      }

      // Store the subscription details in the database
      const { error: subscriptionError } = await supabase
        .from("subscriptions")
        .upsert(
          {
            user_id: user.id,
            plan_type: planType,
            paypal_subscription_id: subscription.id,
            paypal_plan_id: plan.id,
            payment_id: subscription.id,
            status: "pending",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        )

      if (subscriptionError) {
        logger.error("Failed to store subscription in database", {
          userId: user.id,
          error: subscriptionError,
        })
        // Continue anyway, as the PayPal subscription is already created
      }

      // Return the approval URL to redirect the user to PayPal
      return NextResponse.json({
        subscriptionId: subscription.id,
        approvalUrl,
      })
    } catch (error) {
      logger.error("PayPal API error", {
        userId: user.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })

      // Provide a more specific error message based on the error
      let errorMessage = "Failed to create PayPal subscription. Please try again later."

      if (error instanceof Error) {
        if (error.message.includes("credentials")) {
          errorMessage = "PayPal integration is not properly configured. Please contact support."
        } else if (error.message.includes("invalid JSON")) {
          errorMessage = "Received an invalid response from PayPal. Please try again later."
        }
      }

      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
  } catch (error) {
    logger.error("Failed to process subscription request", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json({ error: "An unexpected error occurred. Please try again later." }, { status: 500 })
  }
}
