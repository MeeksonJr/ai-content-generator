import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { logger } from "@/lib/utils/logger"

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
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

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
      logger.error("Error fetching API keys", { context: "API", userId: session.user.id }, error)
      return NextResponse.json({ error: "Failed to fetch API keys" }, { status: 500 })
    }

    return NextResponse.json({ apiKeys })
  } catch (error) {
    logger.error("Error in API keys GET route", { context: "API" }, error as Error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get request body
    const body = await request.json()
    const { keyName } = body

    if (!keyName || keyName.trim().length === 0) {
      return NextResponse.json({ error: "Key name is required" }, { status: 400 })
    }

    // Check user's subscription for API access
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan_type, status")
      .eq("user_id", session.user.id)
      .single()

    if (!subscription || subscription.status !== "active") {
      return NextResponse.json({ error: "Active subscription required for API access" }, { status: 403 })
    }

    // Check if plan supports API access
    const { data: usageLimits } = await supabase
      .from("usage_limits")
      .select("api_access_enabled")
      .eq("plan_type", subscription.plan_type)
      .single()

    if (!usageLimits?.api_access_enabled) {
      return NextResponse.json({ error: "API access not available on your current plan" }, { status: 403 })
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
      return NextResponse.json({ error: "Maximum of 5 API keys allowed per user" }, { status: 400 })
    }

    // Generate new API key
    const { apiKey, keyPrefix } = generateApiKey(session.user.id)

    // Save to database
    const { data: newApiKey, error: insertError } = await supabase
      .from("api_keys")
      .insert({
        user_id: session.user.id,
        key_name: keyName.trim(),
        api_key: apiKey,
        key_prefix: keyPrefix,
        is_active: true,
      })
      .select("id, key_name, key_prefix, is_active, created_at")
      .single()

    if (insertError) {
      logger.error("Error creating API key", { context: "API", userId: session.user.id }, insertError)
      return NextResponse.json({ error: "Failed to create API key" }, { status: 500 })
    }

    logger.info("API key created", {
      context: "API",
      userId: session.user.id,
      keyName: keyName.trim(),
    })

    // Return the full API key only once (for the user to copy)
    return NextResponse.json({
      apiKey: {
        ...newApiKey,
        full_api_key: apiKey, // Only returned once
      },
    })
  } catch (error) {
    logger.error("Error in API keys POST route", { context: "API" }, error as Error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the API key ID from the request
    const url = new URL(request.url)
    const keyId = url.searchParams.get("id")

    if (!keyId) {
      return NextResponse.json({ error: "API key ID is required" }, { status: 400 })
    }

    // Delete the API key
    const { error } = await supabase.from("api_keys").delete().eq("id", keyId).eq("user_id", session.user.id)

    if (error) {
      logger.error("Error deleting API key", { context: "API", userId: session.user.id }, error)
      return NextResponse.json({ error: "Failed to delete API key" }, { status: 500 })
    }

    logger.info("API key deleted", {
      context: "API",
      userId: session.user.id,
      keyId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error("Error in API keys DELETE route", { context: "API" }, error as Error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
