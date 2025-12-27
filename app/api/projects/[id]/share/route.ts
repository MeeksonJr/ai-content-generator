import { NextResponse } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { logger } from "@/lib/utils/logger"
import { handleApiError } from "@/lib/utils/error-handler"

/**
 * GET /api/projects/[id]/share
 * Get project shares (users who have access)
 */
export async function GET(
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

    // Check if user owns the project or has access
    const { data: project } = await supabase
      .from("projects")
      .select("user_id")
      .eq("id", params.id)
      .maybeSingle()

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const projectData = project as { user_id: string }
    const isOwner = projectData.user_id === session.user.id

    // Check if user has been shared with
    const { data: share } = await supabase
      .from("project_shares")
      .select("permission")
      .eq("project_id", params.id)
      .eq("shared_with_user_id", session.user.id)
      .maybeSingle()

    if (!isOwner && !share) {
      return NextResponse.json({ error: "Forbidden - You don't have access to this project" }, { status: 403 })
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
      .eq("project_id", params.id)

    if (error) {
      const { statusCode, error: apiError } = handleApiError(error, "Project Shares")
      return NextResponse.json(apiError, { status: statusCode })
    }

    return NextResponse.json({ shares: shares || [] })
  } catch (error) {
    logger.error("Error fetching project shares", {
      context: "Collaboration",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Project Shares")
    return NextResponse.json(apiError, { status: statusCode })
  }
}

/**
 * POST /api/projects/[id]/share
 * Share project with a user
 */
export async function POST(
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
      return NextResponse.json({ error: "Forbidden - Only project owner can share" }, { status: 403 })
    }

    const body = await request.json()
    const { user_email, permission = "view" } = body

    if (!user_email) {
      return NextResponse.json({ error: "user_email is required" }, { status: 400 })
    }

    if (!["view", "edit", "admin"].includes(permission)) {
      return NextResponse.json(
        { error: "Permission must be one of: view, edit, admin" },
        { status: 400 }
      )
    }

    // Find user by email
    const serverSupabase = createServerSupabaseClient()
    // Note: We need to use admin client to search users by email
    // For now, we'll use a workaround - store email and resolve later
    // Or require user_id instead of email
    
    // Get user by email from auth.users (requires admin access)
    // For now, let's accept user_id as well
    let targetUserId: string | null = null

    if (body.user_id) {
      targetUserId = body.user_id
    } else {
      // Try to find user by email - this requires admin access
      // We'll need to use a different approach or require user_id
      return NextResponse.json(
        { error: "Please provide user_id. Email lookup requires admin access." },
        { status: 400 }
      )
    }

    if (targetUserId === session.user.id) {
      return NextResponse.json({ error: "Cannot share project with yourself" }, { status: 400 })
    }

    // Create share
    const { data: share, error: shareError } = await (serverSupabase as any)
      .from("project_shares")
      .insert({
        project_id: params.id,
        shared_with_user_id: targetUserId,
        shared_by_user_id: session.user.id,
        permission,
      } as any)
      .select()
      .single()

    if (shareError) {
      if (shareError.code === "23505") {
        // Unique constraint violation - already shared
        return NextResponse.json({ error: "Project is already shared with this user" }, { status: 400 })
      }
      const { statusCode, error: apiError } = handleApiError(shareError, "Project Shares")
      return NextResponse.json(apiError, { status: statusCode })
    }

    logger.info("Project shared", {
      context: "Collaboration",
      userId: session.user.id,
      data: { projectId: params.id, sharedWith: targetUserId, permission },
    })

    return NextResponse.json({ success: true, share })
  } catch (error) {
    logger.error("Error sharing project", {
      context: "Collaboration",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Project Shares")
    return NextResponse.json(apiError, { status: statusCode })
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

