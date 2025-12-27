import { NextResponse } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { logger } from "@/lib/utils/logger"
import { handleApiError } from "@/lib/utils/error-handler"
import { getSubscriptionTransactions, formatTransaction } from "@/lib/paypal/transactions"

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseRouteClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Get user's subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (subError) {
      logger.error("Error fetching subscriptions for payment history", {
        context: "PaymentHistory",
        data: { userId },
      }, subError as Error)
      const { statusCode, error } = handleApiError(subError, "Payment History")
      return NextResponse.json(error, { status: statusCode })
    }

    // Get payment history from database
    const serverSupabase = createServerSupabaseClient()
    // @ts-ignore - payment_history table exists but types may not be generated yet
    const { data: paymentHistory, error: historyError } = await serverSupabase
      .from("payment_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100)

    if (historyError && historyError.code !== "PGRST116") {
      logger.error("Error fetching payment history from database", {
        context: "PaymentHistory",
        data: { userId },
      }, historyError as Error)
    }

    // Fetch transactions from PayPal for active subscriptions
    const transactions: any[] = []
    const paypalSubscriptions = subscriptions?.filter((sub) => sub.paypal_subscription_id || sub.payment_id) || []

    for (const subscription of paypalSubscriptions) {
      try {
        const subscriptionId = subscription.paypal_subscription_id || subscription.payment_id
        if (!subscriptionId) continue

        // Get last 12 months of transactions
        const endTime = new Date().toISOString()
        const startTime = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()

        const paypalData = await getSubscriptionTransactions(subscriptionId, startTime, endTime)
        const paypalTransactions = paypalData.transactions || []

        for (const txn of paypalTransactions) {
          const formatted = formatTransaction(txn)
          transactions.push({
            ...formatted,
            subscriptionId: subscription.id,
            planType: subscription.plan_type,
            subscriptionStatus: subscription.status,
          })
        }
      } catch (error) {
        logger.error("Error fetching PayPal transactions", {
          context: "PaymentHistory",
          data: { userId, subscriptionId: subscription.id },
        }, error as Error)
        // Continue with other subscriptions
      }
    }

    // Merge database records with PayPal transactions
    const allPayments = [
      ...(paymentHistory || []).map((payment: any) => ({
        id: payment.transaction_id || payment.id,
        status: payment.status,
        amount: parseFloat(payment.amount),
        currency: payment.currency || "USD",
        date: payment.created_at,
        description: payment.description || "Subscription payment",
        subscriptionId: payment.subscription_id,
        planType: null,
        receiptUrl: payment.receipt_url,
        source: "database",
      })),
      ...transactions.map((txn) => ({
        ...txn,
        source: "paypal",
      })),
    ]

    // Sort by date (newest first) and remove duplicates
    const uniquePayments = Array.from(
      new Map(allPayments.map((payment) => [payment.id, payment])).values()
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    logger.info("Successfully fetched payment history", {
      context: "PaymentHistory",
      data: { userId, count: uniquePayments.length },
    })

    return NextResponse.json({
      payments: uniquePayments,
      total: uniquePayments.length,
    })
  } catch (error) {
    logger.error("Error in payment history API", {
      context: "PaymentHistory",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Payment History")
    return NextResponse.json(apiError, { status: statusCode })
  }
}

