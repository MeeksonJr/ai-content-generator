import { NextResponse } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { logger } from "@/lib/utils/logger"
import { handleApiError } from "@/lib/utils/error-handler"

/**
 * POST /api/notifications/mark-all-read
 * Mark all user's notifications as read
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

    const { error } = await (supabase as any)
      .from("notifications")
      .update({
        read: true,
        read_at: new Date().toISOString(),
      } as any)
      .eq("user_id", session.user.id)
      .eq("read", false)

    if (error) {
      const { statusCode, error: apiError } = handleApiError(error, "Notifications")
      return NextResponse.json(apiError, { status: statusCode })
    }

    logger.info("Marked all notifications as read", {
      context: "Notifications",
      userId: session.user.id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error("Error marking all notifications as read", {
      context: "Notifications",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Notifications")
    return NextResponse.json(apiError, { status: statusCode })
  }
}

