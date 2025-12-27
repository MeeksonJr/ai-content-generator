import { NextResponse } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { logger } from "@/lib/utils/logger"
import { handleApiError } from "@/lib/utils/error-handler"

/**
 * PATCH /api/content/[id]/comments/[commentId]
 * Update a comment
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { commentId } = await params
    const supabase = await createSupabaseRouteClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user owns the comment
    const { data: comment } = await supabase
      .from("content_comments")
      .select("user_id")
      .eq("id", commentId)
      .maybeSingle()

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 })
    }

    const commentData = comment as { user_id: string }
    if (commentData.user_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden - You can only update your own comments" }, { status: 403 })
    }

    const body = await request.json()
    const { comment_text } = body

    if (!comment_text || !comment_text.trim()) {
      return NextResponse.json({ error: "comment_text is required" }, { status: 400 })
    }

    const serverSupabase = createServerSupabaseClient()
    const { data: updatedComment, error } = await (serverSupabase as any)
      .from("content_comments")
      .update({
        comment_text: comment_text.trim(),
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", commentId)
      .select(`
        *,
        user_profiles!content_comments_user_id_fkey (
          display_name,
          email,
          avatar_url
        )
      `)
      .single()

    if (error) {
      const { statusCode, error: apiError } = handleApiError(error, "Comments")
      return NextResponse.json(apiError, { status: statusCode })
    }

    logger.info("Comment updated", {
      context: "Collaboration",
      userId: session.user.id,
      data: { commentId },
    })

    return NextResponse.json({ success: true, comment: updatedComment })
  } catch (error) {
    logger.error("Error updating comment", {
      context: "Collaboration",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Comments")
    return NextResponse.json(apiError, { status: statusCode })
  }
}

/**
 * DELETE /api/content/[id]/comments/[commentId]
 * Delete a comment
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { commentId } = await params
    const supabase = await createSupabaseRouteClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user owns the comment
    const { data: comment } = await supabase
      .from("content_comments")
      .select("user_id")
      .eq("id", commentId)
      .maybeSingle()

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 })
    }

    const commentData = comment as { user_id: string }
    if (commentData.user_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden - You can only delete your own comments" }, { status: 403 })
    }

    const serverSupabase = createServerSupabaseClient()
    const { error } = await (serverSupabase as any)
      .from("content_comments")
      .delete()
      .eq("id", commentId)

    if (error) {
      const { statusCode, error: apiError } = handleApiError(error, "Comments")
      return NextResponse.json(apiError, { status: statusCode })
    }

    logger.info("Comment deleted", {
      context: "Collaboration",
      userId: session.user.id,
      data: { commentId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error("Error deleting comment", {
      context: "Collaboration",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Comments")
    return NextResponse.json(apiError, { status: statusCode })
  }
}

