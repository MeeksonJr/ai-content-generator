import { NextResponse } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { logger } from "@/lib/utils/logger"
import { handleApiError } from "@/lib/utils/error-handler"

/**
 * GET /api/admin/content
 * Fetch content for moderation (admin only)
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

    // Check if user is admin
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("id", session.user.id)
      .maybeSingle()

    const isAdmin = (profile as { is_admin?: boolean } | null)?.is_admin || false

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "all"
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    // Use server client to bypass RLS
    const serverSupabase = createServerSupabaseClient()
    let query = (serverSupabase as any)
      .from("content")
      .select(`
        *,
        user_profiles!content_user_id_fkey (
          display_name,
          email
        )
      `)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (status !== "all") {
      query = query.eq("moderation_status", status)
    }

    const { data: content, error } = await query

    if (error) {
      const { statusCode, error: apiError } = handleApiError(error, "Admin Content")
      return NextResponse.json(apiError, { status: statusCode })
    }

    logger.info("Fetched content for moderation", {
      context: "Admin",
      userId: session.user.id,
      data: { count: content?.length || 0, status },
    })

    return NextResponse.json({ content: content || [] })
  } catch (error) {
    logger.error("Error fetching content for moderation", {
      context: "Admin",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Admin Content")
    return NextResponse.json(apiError, { status: statusCode })
  }
}

