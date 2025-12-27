import { NextResponse } from "next/server"
import { logger } from "@/lib/utils/logger"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { AuthenticationError, AuthorizationError, handleApiError, ValidationError, NotFoundError } from "@/lib/utils/error-handler"

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

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseRouteClient()

    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's API keys
    const { data: apiKeys, error } = await supabase
      .from("api_keys")
      .select("id, key_name, key_prefix, is_active, last_used_at, created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })

    if (error) {
      const { statusCode, error: apiError } = handleApiError(error, "API Keys GET")
      return NextResponse.json(apiError, { status: statusCode })
    }

    return NextResponse.json({ apiKeys })
  } catch (error) {
    const { statusCode, error: apiError } = handleApiError(error, "API Keys GET")
    return NextResponse.json(apiError, { status: statusCode })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseRouteClient()

    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      const { statusCode, error } = handleApiError(new AuthenticationError(), "API Keys POST")
      return NextResponse.json(error, { status: statusCode })
    }

    // Get request body
    const body = await request.json()
    const { keyName } = body

    if (!keyName || keyName.trim().length === 0) {
      const { statusCode, error } = handleApiError(
        new ValidationError("Key name is required"),
        "API Keys POST"
      )
      return NextResponse.json(error, { status: statusCode })
    }

    // Check user's subscription for API access
    const { data: subscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("plan_type, status")
      .eq("user_id", session.user.id)
      .maybeSingle()

    if (subscriptionError && subscriptionError.code !== "PGRST116") {
      const { statusCode, error: apiError } = handleApiError(subscriptionError, "API Keys POST")
      return NextResponse.json(apiError, { status: statusCode })
    }

    const subscriptionData = subscription as { plan_type: string; status: string } | null

    if (!subscriptionData || subscriptionData.status !== "active") {
      const { statusCode, error } = handleApiError(
        new AuthorizationError("Active subscription required for API access"),
        "API Keys POST"
      )
      return NextResponse.json(error, { status: statusCode })
    }

    // Check if plan supports API access
    const { data: usageLimits, error: limitsError } = await supabase
      .from("usage_limits")
      .select("api_access_enabled")
      .eq("plan_type", subscriptionData.plan_type)
      .maybeSingle()

    if (limitsError && limitsError.code !== "PGRST116") {
      const { statusCode, error: apiError } = handleApiError(limitsError, "API Keys POST")
      return NextResponse.json(apiError, { status: statusCode })
    }

    const usageLimitsData = usageLimits as { api_access_enabled: boolean } | null

    if (!usageLimitsData?.api_access_enabled) {
      const { statusCode, error } = handleApiError(
        new AuthorizationError("API access not available on your current plan"),
        "API Keys POST"
      )
      return NextResponse.json(error, { status: statusCode })
    }

    // Check if user already has 5 API keys (limit)
    const { data: existingKeys, error: countError } = await supabase
      .from("api_keys")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("is_active", true)

    if (countError) {
      logger.error("Error counting API keys", { context: "API", userId: session.user.id }, countError)
      return NextResponse.json({ error: "Failed to check API key limit" }, { status: 500 })
    }

    if (existingKeys && existingKeys.length >= 5) {
      const { statusCode, error } = handleApiError(
        new ValidationError("Maximum of 5 API keys allowed per user"),
        "API Keys POST"
      )
      return NextResponse.json(error, { status: statusCode })
    }

    // Generate new API key
    const { apiKey, keyPrefix } = generateApiKey(session.user.id)

    // Save to database
    // @ts-ignore - api_keys table exists but types may not be generated yet
    const { data: newApiKey, error: insertError } = await supabase
      .from("api_keys")
      .insert({
        user_id: session.user.id,
        key_name: keyName.trim(),
        api_key: apiKey,
        key_prefix: keyPrefix,
        is_active: true,
      } as any)
      .select("id, key_name, key_prefix, is_active, created_at")
      .single()

    if (insertError) {
      const { statusCode, error: apiError } = handleApiError(insertError, "API Keys POST")
      return NextResponse.json(apiError, { status: statusCode })
    }

    logger.info("API key created", {
      context: "API",
      userId: session.user.id,
      data: { keyName: keyName.trim() },
    })

    // Return the full API key only once (for the user to copy)
    if (!newApiKey) {
      const { statusCode, error: apiError } = handleApiError(
        new Error("Failed to retrieve created API key"),
        "API Keys POST"
      )
      return NextResponse.json(apiError, { status: statusCode })
    }

    const apiKeyData = newApiKey as {
      id: string
      key_name: string
      key_prefix: string
      is_active: boolean
      created_at: string
    }

    return NextResponse.json({
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
    return NextResponse.json(apiError, { status: statusCode })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createSupabaseRouteClient()

    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      const { statusCode, error } = handleApiError(new AuthenticationError(), "API Keys DELETE")
      return NextResponse.json(error, { status: statusCode })
    }

    // Get the API key ID from the request
    const url = new URL(request.url)
    const keyId = url.searchParams.get("id")

    if (!keyId) {
      const { statusCode, error } = handleApiError(
        new ValidationError("API key ID is required"),
        "API Keys DELETE"
      )
      return NextResponse.json(error, { status: statusCode })
    }

    // Delete the API key
    const { error } = await supabase.from("api_keys").delete().eq("id", keyId).eq("user_id", session.user.id)

    if (error) {
      const { statusCode, error: apiError } = handleApiError(error, "API Keys DELETE")
      return NextResponse.json(apiError, { status: statusCode })
    }

    logger.info("API key deleted", {
      context: "API",
      userId: session.user.id,
      data: { keyId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const { statusCode, error: apiError } = handleApiError(error, "API Keys DELETE")
    return NextResponse.json(apiError, { status: statusCode })
  }
}
