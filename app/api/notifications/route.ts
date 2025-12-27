import { NextResponse } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { logger } from "@/lib/utils/logger"
import { handleApiError } from "@/lib/utils/error-handler"

/**
 * GET /api/notifications
 * Fetch user's notifications
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
    const unreadOnly = searchParams.get("unread") === "true"
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

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
      return NextResponse.json(apiError, { status: statusCode })
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

    return NextResponse.json({
      notifications: notifications || [],
      unreadCount: unreadCount || 0,
    })
  } catch (error) {
    logger.error("Error fetching notifications", {
      context: "Notifications",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Notifications")
    return NextResponse.json(apiError, { status: statusCode })
  }
}

/**
 * POST /api/notifications
 * Create a new notification (for system/admin use)
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

    const body = await request.json()
    const { type, title, message, action_url, metadata, expires_at } = body

    if (!type || !title || !message) {
      return NextResponse.json(
        { error: "Type, title, and message are required" },
        { status: 400 }
      )
    }

    // Validate notification type
    const validTypes = ["info", "success", "warning", "error", "payment", "subscription", "content", "system"]
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid notification type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      )
    }

    const { data: notification, error } = await (supabase as any)
      .from("notifications")
      .insert({
        user_id: session.user.id,
        type,
        title,
        message,
        action_url: action_url || null,
        metadata: metadata || null,
        expires_at: expires_at || null,
      } as any)
      .select()
      .single()

    if (error) {
      const { statusCode, error: apiError } = handleApiError(error, "Notifications")
      return NextResponse.json(apiError, { status: statusCode })
    }

    logger.info("Created notification", {
      context: "Notifications",
      userId: session.user.id,
      data: {
        notificationId: notification.id,
        type,
      },
    })

    return NextResponse.json({ notification }, { status: 201 })
  } catch (error) {
    logger.error("Error creating notification", {
      context: "Notifications",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Notifications")
    return NextResponse.json(apiError, { status: statusCode })
  }
}

