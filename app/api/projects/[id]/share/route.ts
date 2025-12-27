import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { logger } from "@/lib/utils/logger"
import { handleApiError, AuthenticationError, ValidationError, NotFoundError, AuthorizationError } from "@/lib/utils/error-handler"
import { validateUuid, validateEmail } from "@/lib/utils/validation"
import { createSecureResponse, handlePreflight } from "@/lib/utils/security"

/**
 * GET /api/projects/[id]/share
 * Get project shares (users who have access)
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
        new ValidationError(uuidValidation.error || "Invalid project ID format"),
        "Project Shares GET"
      )
      return createSecureResponse(error, statusCode)
    }

    const supabase = await createSupabaseRouteClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      const { statusCode, error } = handleApiError(new AuthenticationError(), "Project Shares GET")
      return createSecureResponse(error, statusCode)
    }

    // Check if user owns the project or has access
    const { data: project } = await supabase
      .from("projects")
      .select("user_id")
      .eq("id", id)
      .maybeSingle()

    if (!project) {
      const { statusCode, error } = handleApiError(new NotFoundError("Project not found"), "Project Shares GET")
      return createSecureResponse(error, statusCode)
    }

    const projectData = project as { user_id: string }
    const isOwner = projectData.user_id === session.user.id

    // Check if user has been shared with
    const { data: share } = await supabase
      .from("project_shares")
      .select("permission")
      .eq("project_id", id)
      .eq("shared_with_user_id", session.user.id)
      .maybeSingle()

    if (!isOwner && !share) {
      const { statusCode, error } = handleApiError(
        new AuthorizationError("You don't have access to this project"),
        "Project Shares GET"
      )
      return createSecureResponse(error, statusCode)
    }

    // Get all shares for this project
    const serverSupabase = createServerSupabaseClient()
    const { data: shares, error } = await (serverSupabase as any)
      .from("project_shares")
      .select(`
        *,
        user_profiles!project_shares_shared_with_user_id_fkey (
          display_name,
          email,
          avatar_url
        )
      `)
      .eq("project_id", id)

    if (error) {
      const { statusCode, error: apiError } = handleApiError(error, "Project Shares")
      return createSecureResponse(apiError, statusCode)
    }

    return createSecureResponse({ shares: shares || [] })
  } catch (error) {
    logger.error("Error fetching project shares", {
      context: "Collaboration",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Project Shares")
    return createSecureResponse(apiError, statusCode)
  }
}

/**
 * POST /api/projects/[id]/share
 * Share project with a user
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
        new ValidationError(uuidValidation.error || "Invalid project ID format"),
        "Project Shares POST"
      )
      return createSecureResponse(error, statusCode)
    }

    const supabase = await createSupabaseRouteClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      const { statusCode, error } = handleApiError(new AuthenticationError(), "Project Shares POST")
      return createSecureResponse(error, statusCode)
    }

    // Check if user owns the project
    const { data: project } = await supabase
      .from("projects")
      .select("user_id")
      .eq("id", id)
      .maybeSingle()

    if (!project) {
      const { statusCode, error } = handleApiError(new NotFoundError("Project not found"), "Project Shares POST")
      return createSecureResponse(error, statusCode)
    }

    const projectData = project as { user_id: string }
    if (projectData.user_id !== session.user.id) {
      const { statusCode, error } = handleApiError(
        new AuthorizationError("Only project owner can share"),
        "Project Shares POST"
      )
      return createSecureResponse(error, statusCode)
    }

    const body = await request.json()
    const { user_email, user_id, permission = "view" } = body

    // Validate user_id or user_email
    let targetUserId: string | null = null
    if (user_id) {
      const userIdValidation = validateUuid(user_id)
      if (!userIdValidation.isValid) {
        const { statusCode, error } = handleApiError(
          new ValidationError(userIdValidation.error || "Invalid user ID format"),
          "Project Shares POST"
        )
        return createSecureResponse(error, statusCode)
      }
      targetUserId = userIdValidation.sanitized!
    } else if (user_email) {
      const emailValidation = validateEmail(user_email)
      if (!emailValidation.isValid) {
        const { statusCode, error } = handleApiError(
          new ValidationError(`Email: ${emailValidation.error}`),
          "Project Shares POST"
        )
        return createSecureResponse(error, statusCode)
      }
      // Email lookup requires admin access - return error for now
      const { statusCode, error } = handleApiError(
        new ValidationError("Please provide user_id. Email lookup requires admin access."),
        "Project Shares POST"
      )
      return createSecureResponse(error, statusCode)
    } else {
      const { statusCode, error } = handleApiError(
        new ValidationError("user_id or user_email is required"),
        "Project Shares POST"
      )
      return createSecureResponse(error, statusCode)
    }

    // Validate permission
    const validPermissions = ["view", "edit", "admin"]
    if (!validPermissions.includes(permission)) {
      const { statusCode, error } = handleApiError(
        new ValidationError(`Permission must be one of: ${validPermissions.join(", ")}`),
        "Project Shares POST"
      )
      return createSecureResponse(error, statusCode)
    }

    if (targetUserId === session.user.id) {
      const { statusCode, error } = handleApiError(
        new ValidationError("Cannot share project with yourself"),
        "Project Shares POST"
      )
      return createSecureResponse(error, statusCode)
    }

    // Create share
    const serverSupabaseClient = createServerSupabaseClient()
    const { data: share, error: shareError } = await (serverSupabaseClient as any)
      .from("project_shares")
      .insert({
        project_id: id,
        shared_with_user_id: targetUserId,
        shared_by_user_id: session.user.id,
        permission,
      } as any)
      .select()
      .single()

    if (shareError) {
      if (shareError.code === "23505") {
        // Unique constraint violation - already shared
        const { statusCode, error } = handleApiError(
          new ValidationError("Project is already shared with this user"),
          "Project Shares POST"
        )
        return createSecureResponse(error, statusCode)
      }
      const { statusCode, error: apiError } = handleApiError(shareError, "Project Shares")
      return createSecureResponse(apiError, statusCode)
    }

    logger.info("Project shared", {
      context: "Collaboration",
      userId: session.user.id,
      data: { projectId: id, sharedWith: targetUserId, permission },
    })

    return createSecureResponse({ success: true, share })
  } catch (error) {
    logger.error("Error sharing project", {
      context: "Collaboration",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Project Shares")
    return createSecureResponse(apiError, statusCode)
  }
}

/**
 * DELETE /api/projects/[id]/share
 * Remove project share
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

    const { searchParams } = new URL(request.url)
    const sharedWithUserId = searchParams.get("user_id")

    if (!sharedWithUserId) {
      return NextResponse.json({ error: "user_id query parameter is required" }, { status: 400 })
    }

    // Check if user owns the project
    const { data: project } = await supabase
      .from("projects")
      .select("user_id")
      .eq("id", params.id)
      .maybeSingle()

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const projectData = project as { user_id: string }
    if (projectData.user_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden - Only project owner can remove shares" }, { status: 403 })
    }

    const serverSupabase = createServerSupabaseClient()
    const { error } = await (serverSupabase as any)
      .from("project_shares")
      .delete()
      .eq("project_id", params.id)
      .eq("shared_with_user_id", sharedWithUserId)

    if (error) {
      const { statusCode, error: apiError } = handleApiError(error, "Project Shares")
      return NextResponse.json(apiError, { status: statusCode })
    }

    logger.info("Project share removed", {
      context: "Collaboration",
      userId: session.user.id,
      data: { projectId: params.id, sharedWith: sharedWithUserId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error("Error removing project share", {
      context: "Collaboration",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Project Shares")
    return NextResponse.json(apiError, { status: statusCode })
  }
}

