import { NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/utils/logger"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { getSubscription } from "@/lib/paypal/client"
import type { Database } from "@/lib/database.types"

type SubscriptionRow = Database["public"]["Tables"]["subscriptions"]["Row"]
type SubscriptionUpdate = Database["public"]["Tables"]["subscriptions"]["Update"]

/**
 * PayPal Webhook Handler
 * Handles subscription events from PayPal:
 * - BILLING.SUBSCRIPTION.CREATED
 * - BILLING.SUBSCRIPTION.ACTIVATED
 * - BILLING.SUBSCRIPTION.CANCELLED
 * - BILLING.SUBSCRIPTION.EXPIRED
 * - BILLING.SUBSCRIPTION.SUSPENDED
 * - BILLING.SUBSCRIPTION.PAYMENT.FAILED
 * - BILLING.SUBSCRIPTION.UPDATED
 */
// In-memory cache for processed event IDs (prevents duplicate processing)
// In production, consider using Redis or a database table for distributed systems
const processedEvents = new Set<string>()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const eventType = body.event_type
    const resource = body.resource
    const eventId = body.id

    // Idempotency check: Skip if we've already processed this event
    if (eventId && processedEvents.has(eventId)) {
      logger.info("Duplicate PayPal webhook event detected, skipping", {
        context: "PayPalWebhook",
        data: {
          eventId,
          eventType,
          resourceId: resource?.id,
        },
      })
      return NextResponse.json({ received: true, duplicate: true })
    }

    logger.info("PayPal webhook received", {
      context: "PayPalWebhook",
      data: {
        eventType,
        resourceId: resource?.id,
        eventId,
      },
    })

    // Handle webhook verification (PayPal sends this when you first configure the webhook)
    if (eventType === "WEBHOOKS.PAYMENT.SALE.COMPLETED" || body.event_type === "PAYMENT.SALE.COMPLETED") {
      logger.info("PayPal webhook verification received", {
        context: "PayPalWebhook",
        data: { eventId },
      })
      // Return 200 to verify the webhook
      return NextResponse.json({ verified: true })
    }

    // Mark event as processed before handling
    if (eventId && typeof eventId === "string") {
      processedEvents.add(eventId)
      // Clean up old events (keep last 1000 to prevent memory leak)
      if (processedEvents.size > 1000) {
        const firstEvent = Array.from(processedEvents)[0]
        if (firstEvent) {
          processedEvents.delete(firstEvent)
        }
      }
    }

    // Handle different event types
    switch (eventType) {
      case "BILLING.SUBSCRIPTION.CREATED":
      case "BILLING.SUBSCRIPTION.ACTIVATED":
        await handleSubscriptionActivated(resource)
        break

      case "BILLING.SUBSCRIPTION.CANCELLED":
        await handleSubscriptionCancelled(resource)
        break

      case "BILLING.SUBSCRIPTION.EXPIRED":
        await handleSubscriptionExpired(resource)
        break

      case "BILLING.SUBSCRIPTION.SUSPENDED":
        await handleSubscriptionSuspended(resource)
        break

      case "BILLING.SUBSCRIPTION.PAYMENT.FAILED":
        await handlePaymentFailed(resource)
        break

      case "BILLING.SUBSCRIPTION.UPDATED":
        await handleSubscriptionUpdated(resource)
        break

      case "PAYMENT.SALE.COMPLETED":
      case "BILLING.SUBSCRIPTION.PAYMENT.COMPLETED":
        await handlePaymentCompleted(resource)
        break

      default:
        logger.info("Unhandled PayPal webhook event type", {
          context: "PayPalWebhook",
          data: { eventType, resourceId: resource?.id },
        })
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true })
  } catch (error) {
    logger.error("Error processing PayPal webhook", { context: "PayPalWebhook" }, error as Error)
    // Still return 200 to prevent PayPal from retrying
    return NextResponse.json({ received: true, error: "Processing failed" }, { status: 200 })
  }
}

/**
 * Handle subscription activation
 */
async function handleSubscriptionActivated(resource: any) {
  const subscriptionId = resource?.id
  if (!subscriptionId) {
    logger.warn("Missing subscription ID in activation webhook", {
      context: "PayPalWebhook",
      data: { resource },
    })
    return
  }

  try {
    const supabase = createServerSupabaseClient()

    // Get subscription details from PayPal
    const subscriptionData = await getSubscription(subscriptionId)

    // Find subscription in database by PayPal subscription ID
    const { data: existingSubscription, error: fetchError } = await supabase
      .from("subscriptions")
      .select("*")
      .or(`paypal_subscription_id.eq.${subscriptionId},payment_id.eq.${subscriptionId}`)
      .maybeSingle()

    if (fetchError) {
      logger.error("Error fetching subscription during activation", {
        context: "PayPalWebhook",
        data: { subscriptionId, error: fetchError },
      })
      return
    }

    if (!existingSubscription) {
      logger.warn("Subscription not found in database during activation", {
        context: "PayPalWebhook",
        data: { subscriptionId },
      })
      return
    }

    const subscription = existingSubscription as SubscriptionRow

    const updateData: any = {
      status: "active",
      updated_at: new Date().toISOString(),
    }

    // Update expires_at if billing_info is available
    if (subscriptionData.billing_info?.next_billing_time) {
      updateData.expires_at = subscriptionData.billing_info.next_billing_time
    }

    // Update existing subscription
    const { error: updateError } = await (supabase as any)
      .from("subscriptions")
      .update(updateData)
      .eq("id", subscription.id)

    if (updateError) {
      logger.error("Error updating subscription during activation", {
        context: "PayPalWebhook",
        data: { subscriptionId, error: updateError },
      })
    } else {
      logger.info("Subscription activated successfully", {
        context: "PayPalWebhook",
        data: { subscriptionId, userId: subscription.user_id },
      })
    }
  } catch (error) {
    logger.error("Error handling subscription activation", {
      context: "PayPalWebhook",
      data: { subscriptionId },
    }, error as Error)
  }
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionCancelled(resource: any) {
  const subscriptionId = resource?.id
  if (!subscriptionId) {
    logger.warn("Missing subscription ID in cancellation webhook", {
      context: "PayPalWebhook",
      data: { resource },
    })
    return
  }

  try {
    const supabase = createServerSupabaseClient()

    const { data: subscription, error: fetchError } = await supabase
      .from("subscriptions")
      .select("*")
      .or(`paypal_subscription_id.eq.${subscriptionId},payment_id.eq.${subscriptionId}`)
      .maybeSingle()

    if (fetchError) {
      logger.error("Error fetching subscription during cancellation", {
        context: "PayPalWebhook",
        data: { subscriptionId, error: fetchError },
      })
      return
    }

    if (!subscription) {
      logger.warn("Subscription not found in database during cancellation", {
        context: "PayPalWebhook",
        data: { subscriptionId },
      })
      return
    }

    const sub = subscription as SubscriptionRow

    const updateData: any = {
      status: "cancelled",
      updated_at: new Date().toISOString(),
      expires_at: new Date().toISOString(),
    }

    const { error: updateError } = await (supabase as any)
      .from("subscriptions")
      .update(updateData)
      .eq("id", sub.id)

    if (updateError) {
      logger.error("Error updating subscription during cancellation", {
        context: "PayPalWebhook",
        data: { subscriptionId, error: updateError },
      })
    } else {
      logger.info("Subscription cancelled successfully", {
        context: "PayPalWebhook",
        data: { subscriptionId, userId: sub.user_id },
      })
    }
  } catch (error) {
    logger.error("Error handling subscription cancellation", {
      context: "PayPalWebhook",
      data: { subscriptionId },
    }, error as Error)
  }
}

/**
 * Handle subscription expiration
 */
async function handleSubscriptionExpired(resource: any) {
  const subscriptionId = resource?.id
  if (!subscriptionId) {
    return
  }

  try {
    const supabase = createServerSupabaseClient()

    const { data: subscription, error: fetchError } = await supabase
      .from("subscriptions")
      .select("*")
      .or(`paypal_subscription_id.eq.${subscriptionId},payment_id.eq.${subscriptionId}`)
      .maybeSingle()

    if (fetchError) {
      logger.error("Error fetching subscription during expiration", {
        context: "PayPalWebhook",
        data: { subscriptionId, error: fetchError },
      })
      return
    }

    if (!subscription) {
      logger.warn("Subscription not found in database during expiration", {
        context: "PayPalWebhook",
        data: { subscriptionId },
      })
      return
    }

    const sub = subscription as SubscriptionRow

    const updateData: any = {
      status: "expired",
      updated_at: new Date().toISOString(),
    }

    const { error: updateError } = await (supabase as any)
      .from("subscriptions")
      .update(updateData)
      .eq("id", sub.id)

    if (updateError) {
      logger.error("Error updating subscription during expiration", {
        context: "PayPalWebhook",
        data: { subscriptionId, error: updateError },
      })
    } else {
      logger.info("Subscription expired successfully", {
        context: "PayPalWebhook",
        data: { subscriptionId, userId: sub.user_id },
      })
    }
  } catch (error) {
    logger.error("Error handling subscription expiration", {
      context: "PayPalWebhook",
      data: { subscriptionId },
    }, error as Error)
  }
}

/**
 * Handle subscription suspension
 */
async function handleSubscriptionSuspended(resource: any) {
  const subscriptionId = resource?.id
  if (!subscriptionId) {
    return
  }

  try {
    const supabase = createServerSupabaseClient()

    const { data: subscription, error: fetchError } = await supabase
      .from("subscriptions")
      .select("*")
      .or(`paypal_subscription_id.eq.${subscriptionId},payment_id.eq.${subscriptionId}`)
      .maybeSingle()

    if (fetchError) {
      logger.error("Error fetching subscription during suspension", {
        context: "PayPalWebhook",
        data: { subscriptionId, error: fetchError },
      })
      return
    }

    if (!subscription) {
      logger.warn("Subscription not found in database during suspension", {
        context: "PayPalWebhook",
        data: { subscriptionId },
      })
      return
    }

    const sub = subscription as SubscriptionRow

    const updateData: any = {
      status: "suspended",
      updated_at: new Date().toISOString(),
    }

    const { error: updateError } = await (supabase as any)
      .from("subscriptions")
      .update(updateData)
      .eq("id", sub.id)

    if (updateError) {
      logger.error("Error updating subscription during suspension", {
        context: "PayPalWebhook",
        data: { subscriptionId, error: updateError },
      })
    } else {
      logger.info("Subscription suspended successfully", {
        context: "PayPalWebhook",
        data: { subscriptionId, userId: sub.user_id },
      })
    }
  } catch (error) {
    logger.error("Error handling subscription suspension", {
      context: "PayPalWebhook",
      data: { subscriptionId },
    }, error as Error)
  }
}

/**
 * Handle payment failure
 */
async function handlePaymentFailed(resource: any) {
  const subscriptionId = resource?.billing_agreement_id || resource?.id
  if (!subscriptionId) {
    return
  }

  try {
    const supabase = createServerSupabaseClient()

    const { data: subscription, error: fetchError } = await supabase
      .from("subscriptions")
      .select("*")
      .or(`paypal_subscription_id.eq.${subscriptionId},payment_id.eq.${subscriptionId}`)
      .maybeSingle()

    if (fetchError) {
      logger.error("Error fetching subscription during payment failure", {
        context: "PayPalWebhook",
        data: { subscriptionId, error: fetchError },
      })
      return
    }

    if (!subscription) {
      logger.warn("Subscription not found in database during payment failure", {
        context: "PayPalWebhook",
        data: { subscriptionId },
      })
      return
    }

    const sub = subscription as SubscriptionRow

    const updateData: any = {
      status: "past_due",
      updated_at: new Date().toISOString(),
    }

    const { error: updateError } = await (supabase as any)
      .from("subscriptions")
      .update(updateData)
      .eq("id", sub.id)

    if (updateError) {
      logger.error("Error updating subscription during payment failure", {
        context: "PayPalWebhook",
        data: { subscriptionId, error: updateError },
      })
    } else {
      logger.info("Subscription marked as past_due due to payment failure", {
        context: "PayPalWebhook",
        data: { subscriptionId, userId: sub.user_id },
      })
    }
  } catch (error) {
    logger.error("Error handling payment failure", {
      context: "PayPalWebhook",
      data: { subscriptionId },
    }, error as Error)
  }
}

/**
 * Handle subscription update
 */
async function handleSubscriptionUpdated(resource: any) {
  const subscriptionId = resource?.id
  if (!subscriptionId) {
    return
  }

  try {
    const supabase = createServerSupabaseClient()

    // Get latest subscription details from PayPal
    const subscriptionData = await getSubscription(subscriptionId)

    const { data: subscription, error: fetchError } = await supabase
      .from("subscriptions")
      .select("*")
      .or(`paypal_subscription_id.eq.${subscriptionId},payment_id.eq.${subscriptionId}`)
      .maybeSingle()

    if (fetchError) {
      logger.error("Error fetching subscription during update", {
        context: "PayPalWebhook",
        data: { subscriptionId, error: fetchError },
      })
      return
    }

    if (!subscription) {
      logger.warn("Subscription not found in database during update", {
        context: "PayPalWebhook",
        data: { subscriptionId },
      })
      return
    }

    const sub = subscription as SubscriptionRow

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    // Map PayPal status to our status
    const statusMap: Record<string, string> = {
      ACTIVE: "active",
      APPROVED: "active",
      SUSPENDED: "suspended",
      CANCELLED: "cancelled",
      EXPIRED: "expired",
    }

    if (subscriptionData.status && statusMap[subscriptionData.status]) {
      updateData.status = statusMap[subscriptionData.status]
    }

    // Update expires_at if billing_info is available
    if (subscriptionData.billing_info?.next_billing_time) {
      updateData.expires_at = subscriptionData.billing_info.next_billing_time
    }

    // @ts-ignore - Supabase type inference issue with maybeSingle()
    const { error: updateError } = await (supabase as any)
      .from("subscriptions")
      .update(updateData)
      .eq("id", sub.id)

    if (updateError) {
      logger.error("Error updating subscription during update", {
        context: "PayPalWebhook",
        data: { subscriptionId, error: updateError },
      })
    } else {
      logger.info("Subscription updated successfully", {
        context: "PayPalWebhook",
        data: { subscriptionId, userId: sub.user_id, status: updateData.status },
      })
    }
  } catch (error) {
    logger.error("Error handling subscription update", {
      context: "PayPalWebhook",
      data: { subscriptionId },
    }, error as Error)
  }
}

/**
 * Store payment transaction in payment_history table
 */
async function storePaymentTransaction(
  userId: string,
  subscriptionId: string | null,
  paypalSubscriptionId: string | null,
  transactionData: {
    transactionId: string
    amount: number
    currency: string
    status: string
    description?: string
    receiptUrl?: string
  }
) {
  try {
    const supabase = createServerSupabaseClient()
    
    // @ts-ignore - payment_history table exists but types may not be generated yet
    const { error } = await supabase.from("payment_history").insert({
      user_id: userId,
      subscription_id: subscriptionId,
      paypal_subscription_id: paypalSubscriptionId,
      transaction_id: transactionData.transactionId,
      amount: transactionData.amount,
      currency: transactionData.currency,
      status: transactionData.status,
      description: transactionData.description || "Subscription payment",
      receipt_url: transactionData.receiptUrl || null,
    } as any)

    if (error) {
      logger.error("Error storing payment transaction", {
        context: "PayPalWebhook",
        data: { userId, transactionId: transactionData.transactionId, error },
      })
    } else {
      logger.info("Payment transaction stored", {
        context: "PayPalWebhook",
        data: { userId, transactionId: transactionData.transactionId },
      })
    }
  } catch (error) {
    logger.error("Error in storePaymentTransaction", {
      context: "PayPalWebhook",
      data: { userId },
    }, error as Error)
  }
}

/**
 * Handle payment completed event
 */
async function handlePaymentCompleted(resource: any) {
  const transactionId = resource?.id || resource?.transaction_id
  const subscriptionId = resource?.billing_agreement_id || resource?.subscription_id

  if (!transactionId || !subscriptionId) {
    logger.warn("Payment completed event missing required data", {
      context: "PayPalWebhook",
      data: { resource },
    })
    return
  }

  try {
    const supabase = createServerSupabaseClient()

    // Find subscription by PayPal subscription ID
    const { data: subscription, error: fetchError } = await supabase
      .from("subscriptions")
      .select("*")
      .or(`paypal_subscription_id.eq.${subscriptionId},payment_id.eq.${subscriptionId}`)
      .maybeSingle()

    if (fetchError || !subscription) {
      logger.warn("Subscription not found for payment completed event", {
        context: "PayPalWebhook",
        data: { subscriptionId, transactionId },
      })
      return
    }

    const sub = subscription as SubscriptionRow

    // Extract payment details from resource
    const amount = parseFloat(resource.amount?.total || resource.amount?.value || "0")
    const currency = resource.amount?.currency || resource.currency_code || "USD"
    const status = resource.state || resource.status || "completed"

    // Store payment transaction
    await storePaymentTransaction(
      sub.user_id,
      sub.id,
      subscriptionId,
      {
        transactionId,
        amount,
        currency,
        status: status.toLowerCase(),
        description: `Subscription payment for ${sub.plan_type} plan`,
        receiptUrl: resource.links?.find((link: any) => link.rel === "self")?.href || null,
      }
    )

    logger.info("Payment completed event processed", {
      context: "PayPalWebhook",
      data: { subscriptionId, transactionId, userId: sub.user_id, amount, currency },
    })
  } catch (error) {
    logger.error("Error handling payment completed", {
      context: "PayPalWebhook",
      data: { subscriptionId, transactionId },
    }, error as Error)
  }
}

