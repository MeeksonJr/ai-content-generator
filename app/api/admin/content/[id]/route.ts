import { NextResponse } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { logger } from "@/lib/utils/logger"
import { handleApiError } from "@/lib/utils/error-handler"

/**
 * PATCH /api/admin/content/[id]
 * Update content moderation status (admin only)
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

    const body = await request.json()
    const { status, notes } = body

    if (!status || !["pending", "approved", "rejected", "flagged"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be: pending, approved, rejected, or flagged" },
        { status: 400 }
      )
    }

    // Use server client to bypass RLS
    const serverSupabase = createServerSupabaseClient()
    const updateData: any = {
      moderation_status: status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: session.user.id,
    }

    if (notes) {
      updateData.moderation_notes = notes
    }

    const { data: content, error } = await (serverSupabase as any)
      .from("content")
      .update(updateData as any)
      .eq("id", params.id)
      .select()
      .single()

    if (error) {
      const { statusCode, error: apiError } = handleApiError(error, "Admin Content")
      return NextResponse.json(apiError, { status: statusCode })
    }

    logger.info("Updated content moderation status", {
      context: "Admin",
      userId: session.user.id,
      data: { contentId: params.id, status },
    })

    return NextResponse.json({ success: true, content })
  } catch (error) {
    logger.error("Error updating content moderation status", {
      context: "Admin",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Admin Content")
    return NextResponse.json(apiError, { status: statusCode })
  }
}

