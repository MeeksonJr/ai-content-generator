// PayPal API client for subscription management
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
      logger.info("PayPal in TEST MODE - returning mock access token", { context: "PayPal" })
      return "mock_access_token_for_testing"
    }

    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      const error = new Error("PayPal credentials are not configured")
      logger.error("Missing PayPal credentials", { context: "PayPal" }, error)
      throw error
    }

    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64")
    logger.info("Requesting PayPal access token", {
      context: "PayPal",
      data: {
        url: `${PAYPAL_API_URL}/v1/oauth2/token`,
        clientIdLength: PAYPAL_CLIENT_ID?.length || 0,
        clientSecretLength: PAYPAL_CLIENT_SECRET?.length || 0,
      },
    })

    const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${auth}`,
      },
      body: "grant_type=client_credentials",
    })

    const responseText = await response.text()
    let responseData

    try {
      // Try to parse as JSON
      responseData = JSON.parse(responseText)
    } catch (parseError) {
      // If parsing fails, log the raw response and throw an error
      logger.error(
        "Failed to parse PayPal response",
        {
          context: "PayPal",
          data: { status: response.status, statusText: response.statusText, response: responseText },
        },
        parseError as Error,
      )
      throw new Error(`PayPal API returned invalid JSON: ${responseText.substring(0, 100)}...`)
    }

    if (!response.ok) {
      const error = new Error(
        `PayPal API error: ${response.status} ${response.statusText} - ${JSON.stringify(responseData)}`,
      )
      logger.error(
        "Failed to get PayPal access token",
        {
          context: "PayPal",
          data: { status: response.status, statusText: response.statusText, response: responseData },
        },
        error,
      )
      throw error
    }

    logger.info("Successfully obtained PayPal access token", { context: "PayPal" })
    return responseData.access_token
  } catch (error) {
    logger.error("Error getting PayPal access token", { context: "PayPal" }, error as Error)
    throw error
  }
}

// Create a subscription plan
export async function createSubscriptionPlan(planData: {
  name: string
  description: string
  amount: number
  interval: "MONTH" | "YEAR"
  currency?: string
}) {
  try {
    if (TEST_MODE) {
      logger.info("PayPal in TEST MODE - returning mock plan", {
        context: "PayPal",
        data: planData,
      })
      return {
        id: `TEST_PLAN_${Date.now()}`,
        name: planData.name,
        description: planData.description,
        status: "ACTIVE",
      }
    }

    const accessToken = await getAccessToken()
    const currency = planData.currency || "USD"

    logger.info("Creating PayPal product", {
      context: "PayPal",
      data: { name: planData.name, description: planData.description },
    })

    // Create a product first
    const productResponse = await fetch(`${PAYPAL_API_URL}/v1/catalogs/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        name: planData.name,
        description: planData.description,
        type: "SERVICE",
        category: "SOFTWARE",
      }),
    })

    const productResponseText = await productResponse.text()
    let product

    try {
      // Try to parse as JSON
      product = JSON.parse(productResponseText)
    } catch (parseError) {
      // If parsing fails, log the raw response and throw an error
      logger.error(
        "Failed to parse PayPal product response",
        {
          context: "PayPal",
          data: {
            status: productResponse.status,
            statusText: productResponse.statusText,
            response: productResponseText,
          },
        },
        parseError as Error,
      )
      throw new Error(`PayPal API returned invalid JSON: ${productResponseText.substring(0, 100)}...`)
    }

    if (!productResponse.ok) {
      const error = new Error(
        `PayPal API error: ${productResponse.status} ${productResponse.statusText} - ${JSON.stringify(product)}`,
      )
      logger.error(
        "Failed to create PayPal product",
        {
          context: "PayPal",
          data: {
            status: productResponse.status,
            statusText: productResponse.statusText,
            response: product,
            planData,
          },
        },
        error,
      )
      throw error
    }

    logger.info("Successfully created PayPal product", {
      context: "PayPal",
      data: { productId: product.id },
    })

    // Create a billing plan
    logger.info("Creating PayPal billing plan", {
      context: "PayPal",
      data: { productId: product.id, name: planData.name },
    })

    const planResponse = await fetch(`${PAYPAL_API_URL}/v1/billing/plans`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        product_id: product.id,
        name: planData.name,
        description: planData.description,
        billing_cycles: [
          {
            frequency: {
              interval_unit: planData.interval,
              interval_count: 1,
            },
            tenure_type: "REGULAR",
            sequence: 1,
            total_cycles: 0, // Infinite
            pricing_scheme: {
              fixed_price: {
                value: planData.amount.toString(),
                currency_code: currency,
              },
            },
          },
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          setup_fee: {
            value: "0",
            currency_code: currency,
          },
          setup_fee_failure_action: "CONTINUE",
          payment_failure_threshold: 3,
        },
      }),
    })

    const planResponseText = await planResponse.text()
    let plan

    try {
      // Try to parse as JSON
      plan = JSON.parse(planResponseText)
    } catch (parseError) {
      // If parsing fails, log the raw response and throw an error
      logger.error(
        "Failed to parse PayPal plan response",
        {
          context: "PayPal",
          data: {
            status: planResponse.status,
            statusText: planResponse.statusText,
            response: planResponseText,
          },
        },
        parseError as Error,
      )
      throw new Error(`PayPal API returned invalid JSON: ${planResponseText.substring(0, 100)}...`)
    }

    if (!planResponse.ok) {
      const error = new Error(
        `PayPal API error: ${planResponse.status} ${planResponse.statusText} - ${JSON.stringify(plan)}`,
      )
      logger.error(
        "Failed to create PayPal billing plan",
        {
          context: "PayPal",
          data: {
            status: planResponse.status,
            statusText: planResponse.statusText,
            response: plan,
            productId: product.id,
            planData,
          },
        },
        error,
      )
      throw error
    }

    logger.info("Successfully created PayPal billing plan", {
      context: "PayPal",
      data: { planId: plan.id },
    })

    return plan
  } catch (error) {
    logger.error("Error creating PayPal subscription plan", { context: "PayPal" }, error as Error)
    throw error
  }
}

// Create a subscription
export async function createSubscription(planId: string, userId: string) {
  try {
    if (TEST_MODE) {
      logger.info("PayPal in TEST MODE - returning mock subscription", {
        context: "PayPal",
        data: { planId },
        userId,
      })

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

      return {
        id: `TEST_SUBSCRIPTION_${Date.now()}`,
        status: "APPROVAL_PENDING",
        links: [
          {
            href: `${appUrl}/dashboard/subscription/success?subscription_id=TEST_SUBSCRIPTION_${Date.now()}`,
            rel: "approve",
            method: "GET",
          },
        ],
      }
    }

    const accessToken = await getAccessToken()

    logger.info("Creating PayPal subscription", {
      context: "PayPal",
      data: { planId },
      userId,
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    const response = await fetch(`${PAYPAL_API_URL}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        plan_id: planId,
        application_context: {
          brand_name: "AI Content Generator",
          locale: "en-US",
          shipping_preference: "NO_SHIPPING",
          user_action: "SUBSCRIBE_NOW",
          payment_method: {
            payer_selected: "PAYPAL",
            payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED",
          },
          return_url: `${appUrl}/dashboard/subscription/success`,
          cancel_url: `${appUrl}/dashboard/subscription/cancel`,
        },
      }),
    })

    const responseText = await response.text()
    let subscription

    try {
      // Try to parse as JSON
      subscription = JSON.parse(responseText)
    } catch (parseError) {
      // If parsing fails, log the raw response and throw an error
      logger.error(
        "Failed to parse PayPal subscription response",
        {
          context: "PayPal",
          data: {
            status: response.status,
            statusText: response.statusText,
            response: responseText,
          },
        },
        parseError as Error,
      )
      throw new Error(`PayPal API returned invalid JSON: ${responseText.substring(0, 100)}...`)
    }

    if (!response.ok) {
      const error = new Error(
        `PayPal API error: ${response.status} ${response.statusText} - ${JSON.stringify(subscription)}`,
      )
      logger.error(
        "Failed to create PayPal subscription",
        {
          context: "PayPal",
          data: {
            status: response.status,
            statusText: response.statusText,
            response: subscription,
            planId,
          },
          userId,
        },
        error,
      )
      throw error
    }

    logger.info("Successfully created PayPal subscription", {
      context: "PayPal",
      data: { subscriptionId: subscription.id },
      userId,
    })

    return subscription
  } catch (error) {
    logger.error(
      "Error creating PayPal subscription",
      {
        context: "PayPal",
        userId,
      },
      error as Error,
    )
    throw error
  }
}

// Get subscription details
export async function getSubscription(subscriptionId: string) {
  try {
    if (TEST_MODE) {
      logger.info("PayPal in TEST MODE - returning mock subscription details", {
        context: "PayPal",
        data: { subscriptionId },
      })
      return {
        id: subscriptionId,
        status: "ACTIVE",
        start_time: new Date().toISOString(),
        billing_info: {
          next_billing_time: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      }
    }

    const accessToken = await getAccessToken()

    logger.info("Getting PayPal subscription details", {
      context: "PayPal",
      data: { subscriptionId },
    })

    const response = await fetch(`${PAYPAL_API_URL}/v1/billing/subscriptions/${subscriptionId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    })

    const responseText = await response.text()
    let subscription

    try {
      // Try to parse as JSON
      subscription = JSON.parse(responseText)
    } catch (parseError) {
      // If parsing fails, log the raw response and throw an error
      logger.error(
        "Failed to parse PayPal subscription details response",
        {
          context: "PayPal",
          data: {
            status: response.status,
            statusText: response.statusText,
            response: responseText,
          },
        },
        parseError as Error,
      )
      throw new Error(`PayPal API returned invalid JSON: ${responseText.substring(0, 100)}...`)
    }

    if (!response.ok) {
      const error = new Error(
        `PayPal API error: ${response.status} ${response.statusText} - ${JSON.stringify(subscription)}`,
      )
      logger.error(
        "Failed to get PayPal subscription details",
        {
          context: "PayPal",
          data: {
            status: response.status,
            statusText: response.statusText,
            response: subscription,
            subscriptionId,
          },
        },
        error,
      )
      throw error
    }

    logger.info("Successfully retrieved PayPal subscription details", {
      context: "PayPal",
      data: {
        subscriptionId,
        status: subscription.status,
      },
    })

    return subscription
  } catch (error) {
    logger.error(
      "Error getting PayPal subscription details",
      {
        context: "PayPal",
        data: { subscriptionId },
      },
      error as Error,
    )
    throw error
  }
}

// Cancel a subscription
export async function cancelSubscription(subscriptionId: string, reason: string, userId: string) {
  try {
    if (TEST_MODE) {
      logger.info("PayPal in TEST MODE - mock canceling subscription", {
        context: "PayPal",
        data: { subscriptionId, reason },
        userId,
      })
      return true
    }

    const accessToken = await getAccessToken()

    logger.info("Canceling PayPal subscription", {
      context: "PayPal",
      data: { subscriptionId, reason },
      userId,
    })

    const response = await fetch(`${PAYPAL_API_URL}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        reason,
      }),
    })

    // For cancel, we don't expect a JSON response body
    if (!response.ok) {
      const responseText = await response.text()
      const error = new Error(`PayPal API error: ${response.status} ${response.statusText} - ${responseText}`)
      logger.error(
        "Failed to cancel PayPal subscription",
        {
          context: "PayPal",
          data: {
            status: response.status,
            statusText: response.statusText,
            response: responseText,
            subscriptionId,
            reason,
          },
          userId,
        },
        error,
      )
      throw error
    }

    logger.info("Successfully canceled PayPal subscription", {
      context: "PayPal",
      data: { subscriptionId },
      userId,
    })

    return true
  } catch (error) {
    logger.error(
      "Error canceling PayPal subscription",
      {
        context: "PayPal",
        data: { subscriptionId },
        userId,
      },
      error as Error,
    )
    throw error
  }
}
