// PayPal Refunds API client
import { logger } from "@/lib/utils/logger"

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET
const PAYPAL_API_URL =
  process.env.NODE_ENV === "production" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com"

// Enable test mode for development/testing without actual PayPal calls
const TEST_MODE = process.env.NODE_ENV !== "production" && process.env.PAYPAL_TEST_MODE === "true"

// Function to get access token
async function getAccessToken(): Promise<string> {
  try {
    if (TEST_MODE) {
      logger.info("PayPal in TEST MODE - returning mock access token", { context: "PayPalRefunds" })
      return "mock_access_token_for_testing"
    }

    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      const error = new Error("PayPal credentials are not configured")
      logger.error("Missing PayPal credentials", { context: "PayPalRefunds" }, error)
      throw error
    }

    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64")

    const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${auth}`,
      },
      body: "grant_type=client_credentials",
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to get access token: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    return data.access_token
  } catch (error) {
    logger.error("Error getting PayPal access token", { context: "PayPalRefunds" }, error as Error)
    throw error
  }
}

/**
 * Refund a PayPal payment
 * @param transactionId - PayPal transaction/sale ID
 * @param amount - Optional partial refund amount (if not provided, full refund)
 * @param reason - Reason for refund
 * @param userId - User ID for logging
 */
export async function refundPayment(
  transactionId: string,
  amount?: number,
  reason?: string,
  userId?: string
) {
  try {
    if (TEST_MODE) {
      logger.info("PayPal in TEST MODE - returning mock refund", {
        context: "PayPalRefunds",
        data: { transactionId, amount, reason },
        userId,
      })
      return {
        id: `TEST_REFUND_${Date.now()}`,
        state: "completed",
        amount: {
          total: amount?.toString() || "29.99",
          currency: "USD",
        },
        sale_id: transactionId,
        create_time: new Date().toISOString(),
        update_time: new Date().toISOString(),
      }
    }

    const accessToken = await getAccessToken()

    logger.info("Processing PayPal refund", {
      context: "PayPalRefunds",
      data: { transactionId, amount, reason },
      userId,
    })

    // Build refund request
    const refundData: any = {}
    if (amount) {
      // Partial refund
      refundData.amount = {
        total: amount.toFixed(2),
        currency: "USD",
      }
    }
    if (reason) {
      refundData.description = reason
    }

    const response = await fetch(`${PAYPAL_API_URL}/v1/payments/sale/${transactionId}/refund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(refundData),
    })

    const responseText = await response.text()
    let refund

    try {
      refund = JSON.parse(responseText)
    } catch {
      throw new Error(`Invalid JSON response: ${responseText}`)
    }

    if (!response.ok) {
      const error = new Error(
        `PayPal API error: ${response.status} ${response.statusText} - ${JSON.stringify(refund)}`
      )
      logger.error("Failed to process PayPal refund", {
        context: "PayPalRefunds",
        data: {
          status: response.status,
          statusText: response.statusText,
          response: refund,
          transactionId,
          amount,
          reason,
        },
        userId,
      }, error)
      throw error
    }

    logger.info("Successfully processed PayPal refund", {
      context: "PayPalRefunds",
      data: { refundId: refund.id, transactionId },
      userId,
    })

    return refund
  } catch (error) {
    logger.error("Error processing PayPal refund", {
      context: "PayPalRefunds",
      data: { transactionId, amount },
      userId,
    }, error as Error)
    throw error
  }
}

/**
 * Get refund details by refund ID
 */
export async function getRefundDetails(refundId: string) {
  try {
    if (TEST_MODE) {
      logger.info("PayPal in TEST MODE - returning mock refund details", {
        context: "PayPalRefunds",
        data: { refundId },
      })
      return {
        id: refundId,
        state: "completed",
        amount: {
          total: "29.99",
          currency: "USD",
        },
        sale_id: "TEST_SALE",
        create_time: new Date().toISOString(),
        update_time: new Date().toISOString(),
      }
    }

    const accessToken = await getAccessToken()

    const response = await fetch(`${PAYPAL_API_URL}/v1/payments/refund/${refundId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to get refund details: ${response.status} ${errorText}`)
    }

    const refund = await response.json()
    return refund
  } catch (error) {
    logger.error("Error fetching refund details", {
      context: "PayPalRefunds",
      data: { refundId },
    }, error as Error)
    throw error
  }
}

