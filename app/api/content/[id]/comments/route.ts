import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { logger } from "@/lib/utils/logger"
import { handleApiError, AuthenticationError, ValidationError, NotFoundError, AuthorizationError } from "@/lib/utils/error-handler"
import { validateText, validateUuid } from "@/lib/utils/validation"
import { createSecureResponse, handlePreflight } from "@/lib/utils/security"
import { API_CONFIG } from "@/lib/constants/app.constants"

/**
 * GET /api/content/[id]/comments
 * Get comments for a content item
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Handle preflight OPTIONS request
    const preflightResponse = handlePreflight(request)
    if (preflightResponse) return preflightResponse

    const { id } = await params

    // Validate UUID
    const uuidValidation = validateUuid(id)
    if (!uuidValidation.isValid) {
      const { statusCode, error } = handleApiError(
        new ValidationError(uuidValidation.error || "Invalid content ID format"),
        "Comments GET"
      )
      return createSecureResponse(error, statusCode)
    }

    const supabase = await createSupabaseRouteClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      const { statusCode, error } = handleApiError(new AuthenticationError(), "Comments GET")
      return createSecureResponse(error, statusCode)
    }

    // Check if user has access to content
    const { data: content } = await supabase
      .from("content")
      .select("id, user_id, project_id")
      .eq("id", id)
      .maybeSingle()

    if (!content) {
      const { statusCode, error } = handleApiError(new NotFoundError("Content not found"), "Comments GET")
      return createSecureResponse(error, statusCode)
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
      const { statusCode, error } = handleApiError(
        new AuthorizationError("You don't have access to this content"),
        "Comments GET"
      )
      return createSecureResponse(error, statusCode)
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
      return createSecureResponse(apiError, statusCode)
    }

    return createSecureResponse({ comments: comments || [] })
  } catch (error) {
    logger.error("Error fetching comments", {
      context: "Collaboration",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Comments")
    return createSecureResponse(apiError, statusCode)
  }
}

/**
 * POST /api/content/[id]/comments
 * Create a comment on content
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Handle preflight OPTIONS request
    const preflightResponse = handlePreflight(request)
    if (preflightResponse) return preflightResponse

    const { id } = await params

    // Validate UUID
    const uuidValidation = validateUuid(id)
    if (!uuidValidation.isValid) {
      const { statusCode, error } = handleApiError(
        new ValidationError(uuidValidation.error || "Invalid content ID format"),
        "Comments POST"
      )
      return createSecureResponse(error, statusCode)
    }

    const supabase = await createSupabaseRouteClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      const { statusCode, error } = handleApiError(new AuthenticationError(), "Comments POST")
      return createSecureResponse(error, statusCode)
    }

    // Check if user has access to content
    const { data: content } = await supabase
      .from("content")
      .select("id, user_id, project_id")
      .eq("id", id)
      .maybeSingle()

    if (!content) {
      const { statusCode, error } = handleApiError(new NotFoundError("Content not found"), "Comments POST")
      return createSecureResponse(error, statusCode)
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
      const { statusCode, error } = handleApiError(
        new AuthorizationError("You don't have access to this content"),
        "Comments POST"
      )
      return createSecureResponse(error, statusCode)
    }

    const body = await request.json()
    const { comment_text, parent_comment_id } = body

    // Validate comment text
    const commentValidation = validateText(comment_text, {
      minLength: 1,
      maxLength: API_CONFIG.MAX_COMMENT_LENGTH,
      required: true,
    })

    if (!commentValidation.isValid) {
      const { statusCode, error } = handleApiError(
        new ValidationError(`Comment: ${commentValidation.error}`),
        "Comments POST"
      )
      return createSecureResponse(error, statusCode)
    }

    // Validate parent_comment_id if provided
    if (parent_comment_id) {
      const parentUuidValidation = validateUuid(parent_comment_id)
      if (!parentUuidValidation.isValid) {
        const { statusCode, error } = handleApiError(
          new ValidationError(parentUuidValidation.error || "Invalid parent comment ID format"),
          "Comments POST"
        )
        return createSecureResponse(error, statusCode)
      }
    }

    const serverSupabase = createServerSupabaseClient()
    const { data: comment, error } = await (serverSupabase as any)
      .from("content_comments")
      .insert({
        content_id: id,
        user_id: session.user.id,
        comment_text: commentValidation.sanitized!,
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
      return createSecureResponse(apiError, statusCode)
    }

    logger.info("Comment created", {
      context: "Collaboration",
      userId: session.user.id,
      data: { contentId: id, commentId: comment.id },
    })

    return createSecureResponse({ success: true, comment })
  } catch (error) {
    logger.error("Error creating comment", {
      context: "Collaboration",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Comments")
    return createSecureResponse(apiError, statusCode)
  }
}

