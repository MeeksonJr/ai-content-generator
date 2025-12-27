import { NextResponse } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { logger } from "@/lib/utils/logger"
import { handleApiError } from "@/lib/utils/error-handler"

/**
 * PATCH /api/notifications/[id]
 * Update a notification (mark as read/unread, etc.)
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseRouteClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { read } = body

    const updateData: any = {}
    if (typeof read === "boolean") {
      updateData.read = read
      if (read) {
        updateData.read_at = new Date().toISOString()
      } else {
        updateData.read_at = null
      }
    }

    const { data: notification, error } = await (supabase as any)
      .from("notifications")
      .update(updateData as any)
      .eq("id", params.id)
      .eq("user_id", session.user.id)
      .select()
      .single()

    if (error) {
      const { statusCode, error: apiError } = handleApiError(error, "Notifications")
      return NextResponse.json(apiError, { status: statusCode })
    }

    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 })
    }

    logger.info("Updated notification", {
      context: "Notifications",
      userId: session.user.id,
      data: {
        notificationId: params.id,
        read,
      },
    })

    return NextResponse.json({ notification })
  } catch (error) {
    logger.error("Error updating notification", {
      context: "Notifications",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Notifications")
    return NextResponse.json(apiError, { status: statusCode })
  }
}

/**
 * DELETE /api/notifications/[id]
 * Delete a notification
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseRouteClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", params.id)
      .eq("user_id", session.user.id)

    if (error) {
      const { statusCode, error: apiError } = handleApiError(error, "Notifications")
      return NextResponse.json(apiError, { status: statusCode })
    }

    logger.info("Deleted notification", {
      context: "Notifications",
      userId: session.user.id,
      data: {
        notificationId: params.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error("Error deleting notification", {
      context: "Notifications",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Notifications")
    return NextResponse.json(apiError, { status: statusCode })
  }
}

