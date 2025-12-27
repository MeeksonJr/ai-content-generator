import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { logger } from "@/lib/utils/logger"
import { handleApiError, AuthenticationError, AuthorizationError, ValidationError, NotFoundError } from "@/lib/utils/error-handler"
import { validateNumber, validateUuid, validateText } from "@/lib/utils/validation"
import { createSecureResponse, handlePreflight } from "@/lib/utils/security"
import { PAGINATION } from "@/lib/constants/app.constants"
import { refundPayment } from "@/lib/paypal/refunds"

/**
 * GET /api/refunds
 * Fetch user's refund history
 */
export async function GET(request: NextRequest) {
  try {
    // Handle preflight OPTIONS request
    const preflightResponse = handlePreflight(request)
    if (preflightResponse) return preflightResponse

    const supabase = await createSupabaseRouteClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      const { statusCode, error } = handleApiError(new AuthenticationError(), "Refunds GET")
      return createSecureResponse(error, statusCode)
    }

    const { searchParams } = new URL(request.url)
    
    // Validate pagination parameters
    const limit = Math.min(
      PAGINATION.MAX_LIMIT,
      Math.max(1, Number.parseInt(searchParams.get("limit") || "50"))
    )
    const offset = Math.max(0, Number.parseInt(searchParams.get("offset") || "0"))

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
      return createSecureResponse(apiError, statusCode)
    }

    logger.info("Fetched refund history", {
      context: "Refunds",
      userId: session.user.id,
      data: { count: refunds?.length || 0 },
    })

    return createSecureResponse({ refunds: refunds || [] })
  } catch (error) {
    logger.error("Error fetching refund history", {
      context: "Refunds",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Refunds")
    return createSecureResponse(apiError, statusCode)
  }
}

/**
 * POST /api/refunds
 * Process a refund (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Handle preflight OPTIONS request
    const preflightResponse = handlePreflight(request)
    if (preflightResponse) return preflightResponse

    const supabase = await createSupabaseRouteClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      const { statusCode, error } = handleApiError(new AuthenticationError(), "Refunds POST")
      return createSecureResponse(error, statusCode)
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("id", session.user.id)
      .maybeSingle()

    const isAdmin = (profile as { is_admin?: boolean } | null)?.is_admin || false

    if (!isAdmin) {
      const { statusCode, error } = handleApiError(
        new AuthorizationError("Admin access required"),
        "Refunds POST"
      )
      return createSecureResponse(error, statusCode)
    }

    const body = await request.json()
    const { paymentId, transactionId, amount, reason } = body

    // Validate that at least one ID is provided
    if (!paymentId && !transactionId) {
      const { statusCode, error } = handleApiError(
        new ValidationError("Either paymentId or transactionId is required"),
        "Refunds POST"
      )
      return createSecureResponse(error, statusCode)
    }

    // Validate paymentId if provided
    if (paymentId) {
      const uuidValidation = validateUuid(paymentId)
      if (!uuidValidation.isValid) {
        const { statusCode, error } = handleApiError(
          new ValidationError(uuidValidation.error || "Invalid payment ID format"),
          "Refunds POST"
        )
        return createSecureResponse(error, statusCode)
      }
    }

    // Validate amount if provided
    if (amount !== undefined) {
      const amountValidation = validateNumber(amount, { min: 0.01, max: 100000 })
      if (!amountValidation.isValid) {
        const { statusCode, error } = handleApiError(
          new ValidationError(`Amount: ${amountValidation.error}`),
          "Refunds POST"
        )
        return createSecureResponse(error, statusCode)
      }
    }

    // Validate reason if provided
    if (reason) {
      const reasonValidation = validateText(reason, { maxLength: 500 })
      if (!reasonValidation.isValid) {
        const { statusCode, error } = handleApiError(
          new ValidationError(`Reason: ${reasonValidation.error}`),
          "Refunds POST"
        )
        return createSecureResponse(error, statusCode)
      }
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
        return createSecureResponse(apiError, statusCode)
      }

      if (!paymentData) {
        const { statusCode, error } = handleApiError(
          new NotFoundError("Payment not found"),
          "Refunds POST"
        )
        return createSecureResponse(error, statusCode)
      }

      payment = paymentData
    }

    // Use transaction_id from payment or provided transactionId
    const paypalTransactionId = payment?.transaction_id || transactionId

    if (!paypalTransactionId) {
      const { statusCode, error } = handleApiError(
        new ValidationError("Transaction ID not found. Cannot process refund without PayPal transaction ID."),
        "Refunds POST"
      )
      return createSecureResponse(error, statusCode)
    }

    // Check if already refunded
    if (payment && payment.refund_status === "completed") {
      const { statusCode, error } = handleApiError(
        new ValidationError("This payment has already been fully refunded"),
        "Refunds POST"
      )
      return createSecureResponse(error, statusCode)
    }

    // Check if partial refund amount is valid
    if (amount && payment) {
      const refundAmount = Number.parseFloat(amount)
      const paymentAmount = Number.parseFloat(payment.amount)
      const alreadyRefunded = Number.parseFloat(payment.refund_amount || "0")

      if (refundAmount <= 0) {
        const { statusCode, error } = handleApiError(
          new ValidationError("Refund amount must be greater than 0"),
          "Refunds POST"
        )
        return createSecureResponse(error, statusCode)
      }

      if (refundAmount > paymentAmount - alreadyRefunded) {
        const { statusCode, error } = handleApiError(
          new ValidationError("Refund amount exceeds available refundable amount"),
          "Refunds POST"
        )
        return createSecureResponse(error, statusCode)
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

    return createSecureResponse({
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
    return createSecureResponse(apiError, statusCode)
  }
}

