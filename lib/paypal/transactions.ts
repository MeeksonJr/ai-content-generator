/**
 * PayPal Transactions API
 * Functions for fetching payment transactions and history
 */

import { logger } from "@/lib/utils/logger"

const TEST_MODE = process.env.NODE_ENV !== "production" && process.env.PAYPAL_TEST_MODE === "true"
const PAYPAL_API_URL = TEST_MODE
  ? "https://api.sandbox.paypal.com"
  : "https://api.paypal.com"

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials not configured")
  }

  const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to get PayPal access token: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  return data.access_token
}

/**
 * Get transactions for a subscription
 */
export async function getSubscriptionTransactions(subscriptionId: string, startTime?: string, endTime?: string) {
  try {
    if (TEST_MODE) {
      logger.info("PayPal in TEST MODE - returning mock transactions", {
        context: "PayPalTransactions",
        data: { subscriptionId },
      })
      // Return mock transaction data
      return {
        transactions: [
          {
            id: "TEST_TXN_1",
            status: "COMPLETED",
            amount: { currency_code: "USD", value: "29.99" },
            time: new Date().toISOString(),
            payer_name: { given_name: "Test", surname: "User" },
            transaction_note: "Monthly subscription payment",
          },
        ],
        total_items: 1,
        total_pages: 1,
      }
    }

    const accessToken = await getAccessToken()

    // Build query parameters
    const params = new URLSearchParams()
    if (startTime) params.append("start_time", startTime)
    if (endTime) params.append("end_time", endTime)
    params.append("transaction_status", "S") // S = Success

    const url = `${PAYPAL_API_URL}/v1/billing/subscriptions/${subscriptionId}/transactions?${params.toString()}`

    logger.info("Fetching PayPal subscription transactions", {
      context: "PayPalTransactions",
      data: { subscriptionId, startTime, endTime },
    })

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error("Failed to fetch PayPal transactions", {
        context: "PayPalTransactions",
        data: { subscriptionId, status: response.status, error: errorText },
      })
      throw new Error(`Failed to fetch transactions: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    logger.error("Error fetching PayPal transactions", {
      context: "PayPalTransactions",
      data: { subscriptionId },
    }, error as Error)
    throw error
  }
}

/**
 * Get transaction details by ID
 */
export async function getTransactionDetails(transactionId: string) {
  try {
    if (TEST_MODE) {
      logger.info("PayPal in TEST MODE - returning mock transaction details", {
        context: "PayPalTransactions",
        data: { transactionId },
      })
      return {
        id: transactionId,
        status: "COMPLETED",
        amount: { currency_code: "USD", value: "29.99" },
        time: new Date().toISOString(),
        payer_name: { given_name: "Test", surname: "User" },
        transaction_note: "Monthly subscription payment",
        links: [
          {
            rel: "self",
            href: `https://api.sandbox.paypal.com/v1/payments/sale/${transactionId}`,
            method: "GET",
          },
        ],
      }
    }

    const accessToken = await getAccessToken()

    // Try to get transaction from subscription transactions first
    // If that fails, try the payments API
    const url = `${PAYPAL_API_URL}/v1/payments/sale/${transactionId}`

    logger.info("Fetching PayPal transaction details", {
      context: "PayPalTransactions",
      data: { transactionId },
    })

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error("Failed to fetch PayPal transaction details", {
        context: "PayPalTransactions",
        data: { transactionId, status: response.status, error: errorText },
      })
      throw new Error(`Failed to fetch transaction details: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    logger.error("Error fetching PayPal transaction details", {
      context: "PayPalTransactions",
      data: { transactionId },
    }, error as Error)
    throw error
  }
}

/**
 * Format transaction for display
 */
export function formatTransaction(transaction: any) {
  return {
    id: transaction.id || transaction.transaction_id,
    status: transaction.status || transaction.transaction_status,
    amount: transaction.amount?.value || transaction.amount,
    currency: transaction.amount?.currency_code || transaction.currency || "USD",
    date: transaction.time || transaction.created_time || transaction.date,
    description: transaction.transaction_note || transaction.description || "Subscription payment",
    payerName: transaction.payer_name
      ? `${transaction.payer_name.given_name || ""} ${transaction.payer_name.surname || ""}`.trim()
      : null,
    receiptUrl: transaction.links?.find((link: any) => link.rel === "self")?.href || null,
  }
}

