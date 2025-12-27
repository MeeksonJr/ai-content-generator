import { NextResponse } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { logger } from "@/lib/utils/logger"
import { handleApiError } from "@/lib/utils/error-handler"

/**
 * GET /api/content/[id]/versions
 * Get version history for content
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

    // Check if user has access to content
    const { data: content } = await supabase
      .from("content")
      .select("id, user_id, project_id")
      .eq("id", params.id)
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

    // Get versions
    const serverSupabase = createServerSupabaseClient()
    const { data: versions, error } = await (serverSupabase as any)
      .from("content_versions")
      .select(`
        *,
        user_profiles!content_versions_user_id_fkey (
          display_name,
          email,
          avatar_url
        )
      `)
      .eq("content_id", params.id)
      .order("version_number", { ascending: false })

    if (error) {
      const { statusCode, error: apiError } = handleApiError(error, "Versions")
      return NextResponse.json(apiError, { status: statusCode })
    }

    return NextResponse.json({ versions: versions || [] })
  } catch (error) {
    logger.error("Error fetching versions", {
      context: "Collaboration",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Versions")
    return NextResponse.json(apiError, { status: statusCode })
  }
}

/**
 * POST /api/content/[id]/versions
 * Create a new version (snapshot) of content
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

    // Get current content
    const { data: content, error: contentError } = await supabase
      .from("content")
      .select("id, user_id, project_id, title, content")
      .eq("id", params.id)
      .maybeSingle()

    if (contentError || !content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 })
    }

    const contentData = content as {
      user_id: string
      project_id: string | null
      title: string
      content: string
    }

    // Check if user has edit access
    const hasEditAccess =
      contentData.user_id === session.user.id ||
      (contentData.project_id &&
        (await supabase
          .from("project_shares")
          .select("permission")
          .eq("project_id", contentData.project_id)
          .eq("shared_with_user_id", session.user.id)
          .in("permission", ["edit", "admin"])
          .maybeSingle()).data)

    if (!hasEditAccess) {
      return NextResponse.json(
        { error: "Forbidden - You don't have edit access to this content" },
        { status: 403 }
      )
    }

    // Get the highest version number
    const serverSupabase = createServerSupabaseClient()
    const { data: latestVersion } = await (serverSupabase as any)
      .from("content_versions")
      .select("version_number")
      .eq("content_id", params.id)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextVersion = latestVersion ? (latestVersion.version_number as number) + 1 : 1

    const body = await request.json()
    const { change_summary } = body

    // Create new version
    const { data: version, error: versionError } = await (serverSupabase as any)
      .from("content_versions")
      .insert({
        content_id: params.id,
        user_id: session.user.id,
        version_number: nextVersion,
        title: contentData.title,
        content: contentData.content,
        change_summary: change_summary || null,
      } as any)
      .select(`
        *,
        user_profiles!content_versions_user_id_fkey (
          display_name,
          email,
          avatar_url
        )
      `)
      .single()

    if (versionError) {
      const { statusCode, error: apiError } = handleApiError(versionError, "Versions")
      return NextResponse.json(apiError, { status: statusCode })
    }

    logger.info("Content version created", {
      context: "Collaboration",
      userId: session.user.id,
      data: { contentId: params.id, versionNumber: nextVersion },
    })

    return NextResponse.json({ success: true, version })
  } catch (error) {
    logger.error("Error creating version", {
      context: "Collaboration",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Versions")
    return NextResponse.json(apiError, { status: statusCode })
  }
}

