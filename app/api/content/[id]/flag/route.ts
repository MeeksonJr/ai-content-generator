import { NextResponse } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { logger } from "@/lib/utils/logger"
import { handleApiError } from "@/lib/utils/error-handler"

/**
 * POST /api/content/[id]/flag
 * Flag content as inappropriate (any authenticated user)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createSupabaseRouteClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { reason } = body

    // Use server client to bypass RLS for update
    const serverSupabase = createServerSupabaseClient()
    
    // First, check if content exists and belongs to user or is public
    const { data: content, error: fetchError } = await (serverSupabase as any)
      .from("content")
      .select("id, user_id, moderation_status")
      .eq("id", id)
      .maybeSingle()

    if (fetchError || !content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 })
    }

    // Update content with flag information
    const updateData: any = {
      moderation_status: "flagged",
      flagged_at: new Date().toISOString(),
      flagged_by: session.user.id,
    }

    if (reason) {
      updateData.flag_reason = reason
    }

    const { data: updatedContent, error: updateError } = await (serverSupabase as any)
      .from("content")
      .update(updateData as any)
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      const { statusCode, error: apiError } = handleApiError(updateError, "Flag Content")
      return NextResponse.json(apiError, { status: statusCode })
    }

    logger.info("Content flagged", {
      context: "Content Moderation",
      userId: session.user.id,
      data: { contentId: id, reason },
    })

    return NextResponse.json({ success: true, content: updatedContent })
  } catch (error) {
    logger.error("Error flagging content", {
      context: "Content Moderation",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Flag Content")
    return NextResponse.json(apiError, { status: statusCode })
  }
}

