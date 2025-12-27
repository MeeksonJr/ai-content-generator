import { NextResponse } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { logger } from "@/lib/utils/logger"
import { handleApiError } from "@/lib/utils/error-handler"

/**
 * POST /api/content/[id]/versions/[versionId]/restore
 * Restore content to a specific version
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const { id, versionId } = await params
    const supabase = await createSupabaseRouteClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get version to restore
    const serverSupabase = createServerSupabaseClient()
    const { data: version, error: versionError } = await (serverSupabase as any)
      .from("content_versions")
      .select("*")
      .eq("id", versionId)
      .eq("content_id", id)
      .maybeSingle()

    if (versionError || !version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 })
    }

    const versionData = version as {
      user_id: string
      title: string
      content: string
      content_id: string
    }

    // Check if user has edit access to content
    const { data: content } = await supabase
      .from("content")
      .select("id, user_id, project_id")
      .eq("id", id)
      .maybeSingle()

    if (!content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 })
    }

    const contentData = content as { user_id: string; project_id: string | null }
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

    // Create a new version snapshot before restoring (to preserve current state)
    const { data: currentContent } = await (serverSupabase as any)
      .from("content")
      .select("title, content")
      .eq("id", id)
      .maybeSingle()

    if (currentContent) {
      // Get next version number
      const { data: latestVersion } = await (serverSupabase as any)
        .from("content_versions")
        .select("version_number")
        .eq("content_id", id)
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle()

      const nextVersion = latestVersion ? (latestVersion.version_number as number) + 1 : 1

      // Save current state as a version
      await (serverSupabase as any)
        .from("content_versions")
        .insert({
          content_id: id,
          user_id: session.user.id,
          version_number: nextVersion,
          title: currentContent.title,
          content: currentContent.content,
          change_summary: "Auto-saved before restore",
        } as any)
    }

    // Restore content from version
    const { data: restoredContent, error: restoreError } = await (serverSupabase as any)
      .from("content")
      .update({
        title: versionData.title,
        content: versionData.content,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", id)
      .select()
      .single()

    if (restoreError) {
      const { statusCode, error: apiError } = handleApiError(restoreError, "Versions")
      return NextResponse.json(apiError, { status: statusCode })
    }

    logger.info("Content restored to version", {
      context: "Collaboration",
      userId: session.user.id,
      data: { contentId: id, versionId },
    })

    return NextResponse.json({ success: true, content: restoredContent })
  } catch (error) {
    logger.error("Error restoring version", {
      context: "Collaboration",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Versions")
    return NextResponse.json(apiError, { status: statusCode })
  }
}

