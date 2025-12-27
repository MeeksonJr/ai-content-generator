import { NextResponse } from "next/server"
import { logger } from "@/lib/utils/logger"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { getSubscription } from "@/lib/paypal/client"
import { handleApiError, AuthorizationError } from "@/lib/utils/error-handler"
import type { Database } from "@/lib/database.types"

type SubscriptionRow = Database["public"]["Tables"]["subscriptions"]["Row"]
type SubscriptionUpdate = Database["public"]["Tables"]["subscriptions"]["Update"]

/**
 * Sync subscription statuses with PayPal
 * This endpoint can be called:
 * - Manually by admins
 * - Via cron job (Vercel Cron, external service, etc.)
 * - On-demand for specific users
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()

    // Optional: Check for admin authentication
    // For cron jobs, you might want to use a secret token instead
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // If CRON_SECRET is set, require it for security
      const { statusCode, error } = handleApiError(
        new AuthorizationError("Unauthorized - Invalid cron secret"),
        "Subscription Sync"
      )
      return NextResponse.json(error, { status: statusCode })
    }

    // Get request body to optionally sync specific user
    const body = await request.json().catch(() => ({}))
    const { userId, subscriptionId } = body

    let subscriptionsQuery = supabase
      .from("subscriptions")
      .select("*")
      .eq("status", "active")
      .not("paypal_subscription_id", "is", null)

    // If specific user/subscription requested, filter
    if (userId) {
      subscriptionsQuery = subscriptionsQuery.eq("user_id", userId)
    }
    if (subscriptionId) {
      subscriptionsQuery = subscriptionsQuery.eq("id", subscriptionId)
    }

    const { data: subscriptions, error: fetchError } = await subscriptionsQuery

    if (fetchError) {
      logger.error("Error fetching subscriptions for sync", {
        context: "Subscription Sync",
        data: { error: fetchError },
      })
      const { statusCode, error } = handleApiError(fetchError, "Subscription Sync")
      return NextResponse.json(error, { status: statusCode })
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        message: "No active subscriptions found to sync",
        synced: 0,
        updated: 0,
        errors: 0,
      })
    }

    let synced = 0
    let updated = 0
    let errors = 0
    const errorsList: Array<{ subscriptionId: string; error: string }> = []

    // Sync each subscription
    for (const subscription of subscriptions) {
      const sub = subscription as SubscriptionRow
      const paypalSubscriptionId = sub.paypal_subscription_id

      if (!paypalSubscriptionId) {
        continue
      }

      try {
        // Get latest status from PayPal
        const paypalData = await getSubscription(paypalSubscriptionId)

        if (!paypalData) {
          logger.warn("PayPal subscription not found", {
            context: "Subscription Sync",
            data: { paypalSubscriptionId, subscriptionId: sub.id },
          })
          errors++
          errorsList.push({
            subscriptionId: sub.id,
            error: "PayPal subscription not found",
          })
          continue
        }

        // Map PayPal status to our status
        const statusMap: Record<string, string> = {
          ACTIVE: "active",
          APPROVED: "active",
          SUSPENDED: "suspended",
          CANCELLED: "cancelled",
          EXPIRED: "expired",
        }

        const newStatus = paypalData.status ? statusMap[paypalData.status] : sub.status

        // Build update data
        const updateData: SubscriptionUpdate = {
          updated_at: new Date().toISOString(),
        }

        // Update status if changed
        if (newStatus && newStatus !== sub.status) {
          updateData.status = newStatus
        }

        // Update expires_at if billing_info is available
        if (paypalData.billing_info?.next_billing_time) {
          const nextBilling = new Date(paypalData.billing_info.next_billing_time)
          updateData.expires_at = nextBilling.toISOString()
        }

        // Only update if there are changes
        if (Object.keys(updateData).length > 1) {
          const { error: updateError } = await supabase
            .from("subscriptions")
            // @ts-ignore - Known Supabase type inference issue with update operations
            .update(updateData)
            .eq("id", sub.id)

          if (updateError) {
            logger.error("Error updating subscription during sync", {
              context: "Subscription Sync",
              data: { subscriptionId: sub.id, error: updateError },
            })
            errors++
            errorsList.push({
              subscriptionId: sub.id,
              error: updateError.message,
            })
          } else {
            updated++
            logger.info("Subscription synced successfully", {
              context: "Subscription Sync",
              data: {
                subscriptionId: sub.id,
                userId: sub.user_id,
                oldStatus: sub.status,
                newStatus: updateData.status || sub.status,
              },
            })
          }
        } else {
          // Subscription is already up to date
          logger.debug("Subscription already in sync", {
            context: "Subscription Sync",
            data: { subscriptionId: sub.id },
          })
        }

        synced++
      } catch (error) {
        logger.error("Error syncing subscription", {
          context: "Subscription Sync",
          data: { subscriptionId: sub.id, paypalSubscriptionId },
        }, error as Error)
        errors++
        errorsList.push({
          subscriptionId: sub.id,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    return NextResponse.json({
      message: `Sync completed: ${synced} processed, ${updated} updated, ${errors} errors`,
      synced,
      updated,
      errors,
      errorsList: errors > 0 ? errorsList : undefined,
    })
  } catch (error) {
    const { statusCode, error: apiError } = handleApiError(error, "Subscription Sync")
    return NextResponse.json(apiError, { status: statusCode })
  }
}

/**
 * GET endpoint to check sync status (for monitoring)
 */
export async function GET() {
  try {
    const supabase = createServerSupabaseClient()

    const { data: subscriptions, error } = await supabase
      .from("subscriptions")
      .select("id, user_id, status, paypal_subscription_id, updated_at")
      .not("paypal_subscription_id", "is", null)
      .order("updated_at", { ascending: false })
      .limit(10)

    if (error) {
      const { statusCode, error: apiError } = handleApiError(error, "Subscription Sync Status")
      return NextResponse.json(apiError, { status: statusCode })
    }

    return NextResponse.json({
      message: "Subscription sync status",
      totalActive: subscriptions?.length || 0,
      recentSubscriptions: subscriptions,
    })
  } catch (error) {
    const { statusCode, error: apiError } = handleApiError(error, "Subscription Sync Status")
    return NextResponse.json(apiError, { status: statusCode })
  }
}

