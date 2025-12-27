import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { logger } from "@/lib/utils/logger"
import { handleApiError, AuthenticationError, ValidationError } from "@/lib/utils/error-handler"
import { validateText, validateUrl } from "@/lib/utils/validation"
import { createSecureResponse, handlePreflight } from "@/lib/utils/security"
import { PAGINATION, API_CONFIG } from "@/lib/constants/app.constants"

/**
 * GET /api/notifications
 * Fetch user's notifications
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
      const { statusCode, error } = handleApiError(new AuthenticationError(), "Notifications GET")
      return createSecureResponse(error, statusCode)
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get("unread") === "true"
    
    // Validate and sanitize pagination parameters
    const limit = Math.min(
      PAGINATION.MAX_LIMIT,
      Math.max(1, Number.parseInt(searchParams.get("limit") || String(PAGINATION.DEFAULT_LIMIT)))
    )
    const offset = Math.max(0, Number.parseInt(searchParams.get("offset") || "0"))

    let query = supabase
      .from("notifications")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (unreadOnly) {
      query = query.eq("read", false)
    }

    // Filter out expired notifications
    query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)

    const { data: notifications, error } = await query

    if (error) {
      const { statusCode, error: apiError } = handleApiError(error, "Notifications")
      return createSecureResponse(apiError, statusCode)
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", session.user.id)
      .eq("read", false)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)

    logger.info("Fetched notifications", {
      context: "Notifications",
      userId: session.user.id,
      data: {
        count: notifications?.length || 0,
        unreadCount: unreadCount || 0,
      },
    })

    return createSecureResponse({
      notifications: notifications || [],
      unreadCount: unreadCount || 0,
    })
  } catch (error) {
    logger.error("Error fetching notifications", {
      context: "Notifications",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Notifications")
    return createSecureResponse(apiError, statusCode)
  }
}

/**
 * POST /api/notifications
 * Create a new notification (for system/admin use)
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
      const { statusCode, error } = handleApiError(new AuthenticationError(), "Notifications POST")
      return createSecureResponse(error, statusCode)
    }

    const body = await request.json()
    const { type, title, message, action_url, metadata, expires_at } = body

    // Validate required fields
    if (!type || !title || !message) {
      const { statusCode, error } = handleApiError(
        new ValidationError("Type, title, and message are required"),
        "Notifications POST"
      )
      return createSecureResponse(error, statusCode)
    }

    // Validate notification type
    const validTypes = ["info", "success", "warning", "error", "payment", "subscription", "content", "system"]
    if (!validTypes.includes(type)) {
      const { statusCode, error } = handleApiError(
        new ValidationError(`Invalid notification type. Must be one of: ${validTypes.join(", ")}`),
        "Notifications POST"
      )
      return createSecureResponse(error, statusCode)
    }

    // Validate and sanitize title and message
    const titleValidation = validateText(title, { minLength: 1, maxLength: 200, required: true })
    const messageValidation = validateText(message, { minLength: 1, maxLength: 1000, required: true })

    if (!titleValidation.isValid || !messageValidation.isValid) {
      const errors = []
      if (!titleValidation.isValid) errors.push(`Title: ${titleValidation.error}`)
      if (!messageValidation.isValid) errors.push(`Message: ${messageValidation.error}`)

      const { statusCode, error } = handleApiError(
        new ValidationError(errors.join(", ")),
        "Notifications POST"
      )
      return createSecureResponse(error, statusCode)
    }

    // Validate action_url if provided
    let sanitizedActionUrl: string | null = null
    if (action_url) {
      const urlValidation = validateUrl(action_url)
      if (!urlValidation.isValid) {
        const { statusCode, error } = handleApiError(
          new ValidationError(`Action URL: ${urlValidation.error}`),
          "Notifications POST"
        )
        return createSecureResponse(error, statusCode)
      }
      sanitizedActionUrl = urlValidation.sanitized || null
    }

    const { data: notification, error } = await (supabase as any)
      .from("notifications")
      .insert({
        user_id: session.user.id,
        type,
        title: titleValidation.sanitized!,
        message: messageValidation.sanitized!,
        action_url: sanitizedActionUrl,
        metadata: metadata || null,
        expires_at: expires_at || null,
      } as any)
      .select()
      .single()

    if (error) {
      const { statusCode, error: apiError } = handleApiError(error, "Notifications")
      return createSecureResponse(apiError, statusCode)
    }

    logger.info("Created notification", {
      context: "Notifications",
      userId: session.user.id,
      data: {
        notificationId: notification.id,
        type,
      },
    })

    return createSecureResponse({ notification }, 201)
  } catch (error) {
    logger.error("Error creating notification", {
      context: "Notifications",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Notifications")
    return createSecureResponse(apiError, statusCode)
  }
}

