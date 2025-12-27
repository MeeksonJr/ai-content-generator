import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { logger } from "@/lib/utils/logger"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { AuthenticationError, AuthorizationError, handleApiError, ValidationError, NotFoundError } from "@/lib/utils/error-handler"
import { validateText } from "@/lib/utils/validation"
import { createSecureResponse, handlePreflight } from "@/lib/utils/security"
import { API_CONFIG, ERROR_MESSAGES, SUCCESS_MESSAGES } from "@/lib/constants/app.constants"

// Generate a secure API key
function generateApiKey(userId: string): { apiKey: string; keyPrefix: string } {
  const prefix = "sk"
  const userPrefix = userId.substring(0, 8)
  const randomSuffix = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  const apiKey = `${prefix}_${userPrefix}_${randomSuffix}`

  return {
    apiKey,
    keyPrefix: `${prefix}_${userPrefix}`,
  }
}

export async function GET(request: NextRequest) {
  try {
    // Handle preflight OPTIONS request
    const preflightResponse = handlePreflight(request)
    if (preflightResponse) return preflightResponse

    const supabase = await createSupabaseRouteClient()

    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return createSecureResponse({ error: ERROR_MESSAGES.UNAUTHORIZED }, 401)
    }

    // Get user's API keys
    const { data: apiKeys, error } = await supabase
      .from("api_keys")
      .select("id, key_name, key_prefix, is_active, last_used_at, created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })

    if (error) {
      const { statusCode, error: apiError } = handleApiError(error, "API Keys GET")
      return createSecureResponse(apiError, statusCode)
    }

    return createSecureResponse({ apiKeys })
  } catch (error) {
    const { statusCode, error: apiError } = handleApiError(error, "API Keys GET")
    return createSecureResponse(apiError, statusCode)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Handle preflight OPTIONS request
    const preflightResponse = handlePreflight(request)
    if (preflightResponse) return preflightResponse

    const supabase = await createSupabaseRouteClient()

    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      const { statusCode, error } = handleApiError(new AuthenticationError(), "API Keys POST")
      return createSecureResponse(error, statusCode)
    }

    // Get request body
    const body = await request.json()
    const { keyName } = body

    // Validate key name
    const keyNameValidation = validateText(keyName, {
      minLength: 1,
      maxLength: 100,
      required: true,
    })

    if (!keyNameValidation.isValid) {
      const { statusCode, error } = handleApiError(
        new ValidationError(`Key name: ${keyNameValidation.error}`),
        "API Keys POST"
      )
      return createSecureResponse(error, statusCode)
    }

    // Check user's subscription for API access
    const { data: subscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("plan_type, status")
      .eq("user_id", session.user.id)
      .maybeSingle()

    if (subscriptionError && subscriptionError.code !== "PGRST116") {
      const { statusCode, error: apiError } = handleApiError(subscriptionError, "API Keys POST")
      return createSecureResponse(apiError, statusCode)
    }

    const subscriptionData = subscription as { plan_type: string; status: string } | null

    if (!subscriptionData || subscriptionData.status !== "active") {
      const { statusCode, error } = handleApiError(
        new AuthorizationError("Active subscription required for API access"),
        "API Keys POST"
      )
      return createSecureResponse(error, statusCode)
    }

    // Check if plan supports API access
    const { data: usageLimits, error: limitsError } = await supabase
      .from("usage_limits")
      .select("api_access_enabled")
      .eq("plan_type", subscriptionData.plan_type)
      .maybeSingle()

    if (limitsError && limitsError.code !== "PGRST116") {
      const { statusCode, error: apiError } = handleApiError(limitsError, "API Keys POST")
      return createSecureResponse(apiError, statusCode)
    }

    const usageLimitsData = usageLimits as { api_access_enabled: boolean } | null

    if (!usageLimitsData?.api_access_enabled) {
      const { statusCode, error } = handleApiError(
        new AuthorizationError("API access not available on your current plan"),
        "API Keys POST"
      )
      return createSecureResponse(error, statusCode)
    }

    // Check if user already has 5 API keys (limit)
    const { data: existingKeys, error: countError } = await supabase
      .from("api_keys")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("is_active", true)

    if (countError) {
      logger.error("Error counting API keys", { context: "API", userId: session.user.id }, countError)
      return createSecureResponse({ error: "Failed to check API key limit" }, 500)
    }

    if (existingKeys && existingKeys.length >= 5) {
      const { statusCode, error } = handleApiError(
        new ValidationError("Maximum of 5 API keys allowed per user"),
        "API Keys POST"
      )
      return createSecureResponse(error, statusCode)
    }

    // Generate new API key
    const { apiKey, keyPrefix } = generateApiKey(session.user.id)

    // Save to database
    // @ts-ignore - api_keys table exists but types may not be generated yet
    const { data: newApiKey, error: insertError } = await supabase
      .from("api_keys")
      .insert({
        user_id: session.user.id,
        key_name: keyNameValidation.sanitized!,
        api_key: apiKey,
        key_prefix: keyPrefix,
        is_active: true,
      } as any)
      .select("id, key_name, key_prefix, is_active, created_at")
      .single()

    if (insertError) {
      const { statusCode, error: apiError } = handleApiError(insertError, "API Keys POST")
      return createSecureResponse(apiError, statusCode)
    }

    logger.info("API key created", {
      context: "API",
      userId: session.user.id,
      data: { keyName: keyNameValidation.sanitized },
    })

    // Return the full API key only once (for the user to copy)
    if (!newApiKey) {
      const { statusCode, error: apiError } = handleApiError(
        new Error("Failed to retrieve created API key"),
        "API Keys POST"
      )
      return createSecureResponse(apiError, statusCode)
    }

    const apiKeyData = newApiKey as {
      id: string
      key_name: string
      key_prefix: string
      is_active: boolean
      created_at: string
    }

    return createSecureResponse({
      apiKey: {
        id: apiKeyData.id,
        key_name: apiKeyData.key_name,
        key_prefix: apiKeyData.key_prefix,
        is_active: apiKeyData.is_active,
        created_at: apiKeyData.created_at,
        full_api_key: apiKey, // Only returned once
      },
    })
  } catch (error) {
    const { statusCode, error: apiError } = handleApiError(error, "API Keys POST")
    return createSecureResponse(apiError, statusCode)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Handle preflight OPTIONS request
    const preflightResponse = handlePreflight(request)
    if (preflightResponse) return preflightResponse

    const supabase = await createSupabaseRouteClient()

    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      const { statusCode, error } = handleApiError(new AuthenticationError(), "API Keys DELETE")
      return createSecureResponse(error, statusCode)
    }

    // Get the API key ID from the request
    const url = new URL(request.url)
    const keyId = url.searchParams.get("id")

    if (!keyId) {
      const { statusCode, error } = handleApiError(
        new ValidationError("API key ID is required"),
        "API Keys DELETE"
      )
      return createSecureResponse(error, statusCode)
    }

    // Validate UUID format
    const uuidValidation = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidValidation.test(keyId)) {
      const { statusCode, error } = handleApiError(
        new ValidationError("Invalid API key ID format"),
        "API Keys DELETE"
      )
      return createSecureResponse(error, statusCode)
    }

    // Delete the API key
    const { error } = await supabase.from("api_keys").delete().eq("id", keyId).eq("user_id", session.user.id)

    if (error) {
      const { statusCode, error: apiError } = handleApiError(error, "API Keys DELETE")
      return createSecureResponse(apiError, statusCode)
    }

    logger.info("API key deleted", {
      context: "API",
      userId: session.user.id,
      data: { keyId },
    })

    return createSecureResponse({ success: true, message: SUCCESS_MESSAGES.DELETED })
  } catch (error) {
    const { statusCode, error: apiError } = handleApiError(error, "API Keys DELETE")
    return createSecureResponse(apiError, statusCode)
  }
}
