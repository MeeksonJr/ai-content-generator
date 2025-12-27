import { NextResponse } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { logger } from "@/lib/utils/logger"
import { handleApiError } from "@/lib/utils/error-handler"

/**
 * GET /api/admin/check
 * Check if the current user is an admin
 */
export async function GET() {
  try {
    const supabase = await createSupabaseRouteClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ isAdmin: false }, { status: 200 })
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("id", session.user.id)
      .maybeSingle()

    const isAdmin = (profile as { is_admin?: boolean } | null)?.is_admin || false

    logger.info("Admin check", {
      context: "Admin",
      userId: session.user.id,
      data: { isAdmin },
    })

    return NextResponse.json({ isAdmin })
  } catch (error) {
    logger.error("Error checking admin status", {
      context: "Admin",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Admin Check")
    return NextResponse.json(apiError, { status: statusCode })
  }
}

