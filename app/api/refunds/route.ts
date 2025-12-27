import { NextResponse } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { logger } from "@/lib/utils/logger"
import { handleApiError } from "@/lib/utils/error-handler"
import { refundPayment } from "@/lib/paypal/refunds"

/**
 * GET /api/refunds
 * Fetch user's refund history
 */
export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseRouteClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    // Get refunded payments from payment_history
    const serverSupabase = createServerSupabaseClient()
    const { data: refunds, error } = await (serverSupabase as any)
      .from("payment_history")
      .select("*")
      .eq("user_id", session.user.id)
      .not("refund_status", "is", null)
      .order("refunded_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      const { statusCode, error: apiError } = handleApiError(error, "Refunds")
      return NextResponse.json(apiError, { status: statusCode })
    }

    logger.info("Fetched refund history", {
      context: "Refunds",
      userId: session.user.id,
      data: { count: refunds?.length || 0 },
    })

    return NextResponse.json({ refunds: refunds || [] })
  } catch (error) {
    logger.error("Error fetching refund history", {
      context: "Refunds",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Refunds")
    return NextResponse.json(apiError, { status: statusCode })
  }
}

/**
 * POST /api/refunds
 * Process a refund (admin only)
 */
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseRouteClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("id", session.user.id)
      .maybeSingle()

    const isAdmin = (profile as { is_admin?: boolean } | null)?.is_admin || false

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { paymentId, transactionId, amount, reason } = body

    if (!paymentId && !transactionId) {
      return NextResponse.json(
        { error: "Either paymentId or transactionId is required" },
        { status: 400 }
      )
    }

    // Get payment details
    const serverSupabase = createServerSupabaseClient()
    let payment: any = null

    if (paymentId) {
      const { data: paymentData, error: paymentError } = await (serverSupabase as any)
        .from("payment_history")
        .select("*")
        .eq("id", paymentId)
        .maybeSingle()

      if (paymentError) {
        const { statusCode, error: apiError } = handleApiError(paymentError, "Refunds")
        return NextResponse.json(apiError, { status: statusCode })
      }

      if (!paymentData) {
        return NextResponse.json({ error: "Payment not found" }, { status: 404 })
      }

      payment = paymentData
    }

    // Use transaction_id from payment or provided transactionId
    const paypalTransactionId = payment?.transaction_id || transactionId

    if (!paypalTransactionId) {
      return NextResponse.json(
        { error: "Transaction ID not found. Cannot process refund without PayPal transaction ID." },
        { status: 400 }
      )
    }

    // Check if already refunded
    if (payment && payment.refund_status === "completed") {
      return NextResponse.json(
        { error: "This payment has already been fully refunded" },
        { status: 400 }
      )
    }

    // Check if partial refund amount is valid
    if (amount && payment) {
      const refundAmount = Number.parseFloat(amount)
      const paymentAmount = Number.parseFloat(payment.amount)
      const alreadyRefunded = Number.parseFloat(payment.refund_amount || "0")

      if (refundAmount <= 0) {
        return NextResponse.json({ error: "Refund amount must be greater than 0" }, { status: 400 })
      }

      if (refundAmount > paymentAmount - alreadyRefunded) {
        return NextResponse.json(
          { error: "Refund amount exceeds available refundable amount" },
          { status: 400 }
        )
      }
    }

    // Process refund with PayPal
    const refundAmount = amount ? Number.parseFloat(amount) : undefined
    const refund = await refundPayment(paypalTransactionId, refundAmount, reason, session.user.id)

    // Update payment_history with refund information
    const updateData: any = {
      refund_status: refund.state === "completed" ? "completed" : "pending",
      refund_id: refund.id,
      refund_reason: reason || null,
      refunded_at: new Date().toISOString(),
      refunded_by: session.user.id,
    }

    if (refund.amount) {
      const refundValue = Number.parseFloat(refund.amount.total || "0")
      if (payment) {
        // Add to existing refund amount for partial refunds
        const existingRefund = Number.parseFloat(payment.refund_amount || "0")
        updateData.refund_amount = existingRefund + refundValue
        updateData.refund_currency = refund.amount.currency || payment.currency

        // Check if fully refunded
        const paymentAmount = Number.parseFloat(payment.amount)
        if (updateData.refund_amount >= paymentAmount) {
          updateData.refund_status = "completed"
        } else {
          updateData.refund_status = "partial"
        }
      } else {
        updateData.refund_amount = refundValue
        updateData.refund_currency = refund.amount.currency || "USD"
      }
    }

    if (paymentId) {
      const { error: updateError } = await (serverSupabase as any)
        .from("payment_history")
        .update(updateData as any)
        .eq("id", paymentId)

      if (updateError) {
        logger.error("Error updating payment history with refund", {
          context: "Refunds",
          userId: session.user.id,
        }, updateError)
        // Don't fail the request - refund was processed, just log the error
      }
    }

    logger.info("Refund processed successfully", {
      context: "Refunds",
      userId: session.user.id,
      data: {
        refundId: refund.id,
        paymentId,
        transactionId: paypalTransactionId,
        amount: refundAmount,
      },
    })

    return NextResponse.json({
      success: true,
      refund: {
        id: refund.id,
        status: refund.state,
        amount: refund.amount?.total || refundAmount?.toString(),
        currency: refund.amount?.currency || "USD",
        transactionId: paypalTransactionId,
      },
    })
  } catch (error) {
    logger.error("Error processing refund", {
      context: "Refunds",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Refunds")
    return NextResponse.json(apiError, { status: statusCode })
  }
}

