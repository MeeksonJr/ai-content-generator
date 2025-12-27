import { NextResponse } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { logger } from "@/lib/utils/logger"
import { handleApiError } from "@/lib/utils/error-handler"

/**
 * GET /api/content/[id]/comments
 * Get comments for a content item
 */
export async function GET(
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

    // Check if user has access to content
    const { data: content } = await supabase
      .from("content")
      .select("id, user_id, project_id")
      .eq("id", id)
      .maybeSingle()

    if (!content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 })
    }

    const contentData = content as { user_id: string; project_id: string | null }
    const hasAccess =
      contentData.user_id === session.user.id ||
      (contentData.project_id &&
        (await supabase
          .from("project_shares")
          .select("id")
          .eq("project_id", contentData.project_id)
          .eq("shared_with_user_id", session.user.id)
          .maybeSingle()).data)

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden - You don't have access to this content" }, { status: 403 })
    }

    // Get comments
    const serverSupabase = createServerSupabaseClient()
    const { data: comments, error } = await (serverSupabase as any)
      .from("content_comments")
      .select(`
        *,
        user_profiles!content_comments_user_id_fkey (
          display_name,
          email,
          avatar_url
        )
      `)
      .eq("content_id", id)
      .order("created_at", { ascending: true })

    if (error) {
      const { statusCode, error: apiError } = handleApiError(error, "Comments")
      return NextResponse.json(apiError, { status: statusCode })
    }

    return NextResponse.json({ comments: comments || [] })
  } catch (error) {
    logger.error("Error fetching comments", {
      context: "Collaboration",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Comments")
    return NextResponse.json(apiError, { status: statusCode })
  }
}

/**
 * POST /api/content/[id]/comments
 * Create a comment on content
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

    // Check if user has access to content
    const { data: content } = await supabase
      .from("content")
      .select("id, user_id, project_id")
      .eq("id", id)
      .maybeSingle()

    if (!content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 })
    }

    const contentData = content as { user_id: string; project_id: string | null }
    const hasAccess =
      contentData.user_id === session.user.id ||
      (contentData.project_id &&
        (await supabase
          .from("project_shares")
          .select("id")
          .eq("project_id", contentData.project_id)
          .eq("shared_with_user_id", session.user.id)
          .maybeSingle()).data)

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden - You don't have access to this content" }, { status: 403 })
    }

    const body = await request.json()
    const { comment_text, parent_comment_id } = body

    if (!comment_text || !comment_text.trim()) {
      return NextResponse.json({ error: "comment_text is required" }, { status: 400 })
    }

    const serverSupabase = createServerSupabaseClient()
    const { data: comment, error } = await (serverSupabase as any)
      .from("content_comments")
      .insert({
        content_id: id,
        user_id: session.user.id,
        comment_text: comment_text.trim(),
        parent_comment_id: parent_comment_id || null,
      } as any)
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

    logger.info("Comment created", {
      context: "Collaboration",
      userId: session.user.id,
      data: { contentId: id, commentId: comment.id },
    })

    return NextResponse.json({ success: true, comment })
  } catch (error) {
    logger.error("Error creating comment", {
      context: "Collaboration",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Comments")
    return NextResponse.json(apiError, { status: statusCode })
  }
}

