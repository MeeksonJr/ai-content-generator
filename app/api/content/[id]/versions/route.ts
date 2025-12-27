import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { logger } from "@/lib/utils/logger"
import { handleApiError, AuthenticationError, ValidationError, NotFoundError, AuthorizationError } from "@/lib/utils/error-handler"
import { validateUuid, validateText } from "@/lib/utils/validation"
import { createSecureResponse, handlePreflight } from "@/lib/utils/security"
import { API_CONFIG } from "@/lib/constants/app.constants"

/**
 * GET /api/content/[id]/versions
 * Get version history for content
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
        "Versions GET"
      )
      return createSecureResponse(error, statusCode)
    }

    const supabase = await createSupabaseRouteClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      const { statusCode, error } = handleApiError(new AuthenticationError(), "Versions GET")
      return createSecureResponse(error, statusCode)
    }

    // Check if user has access to content
    const { data: content } = await supabase
      .from("content")
      .select("id, user_id, project_id")
      .eq("id", id)
      .maybeSingle()

    if (!content) {
      const { statusCode, error } = handleApiError(new NotFoundError("Content not found"), "Versions GET")
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
        "Versions GET"
      )
      return createSecureResponse(error, statusCode)
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
      .eq("content_id", id)
      .order("version_number", { ascending: false })

    if (error) {
      const { statusCode, error: apiError } = handleApiError(error, "Versions")
      return createSecureResponse(apiError, statusCode)
    }

    return createSecureResponse({ versions: versions || [] })
  } catch (error) {
    logger.error("Error fetching versions", {
      context: "Collaboration",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Versions")
    return createSecureResponse(apiError, statusCode)
  }
}

/**
 * POST /api/content/[id]/versions
 * Create a new version (snapshot) of content
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
        "Versions POST"
      )
      return createSecureResponse(error, statusCode)
    }

    const supabase = await createSupabaseRouteClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      const { statusCode, error } = handleApiError(new AuthenticationError(), "Versions POST")
      return createSecureResponse(error, statusCode)
    }

    // Get current content
    const { data: content, error: contentError } = await supabase
      .from("content")
      .select("id, user_id, project_id, title, content")
      .eq("id", id)
      .maybeSingle()

    if (contentError || !content) {
      const { statusCode, error } = handleApiError(new NotFoundError("Content not found"), "Versions POST")
      return createSecureResponse(error, statusCode)
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
      const { statusCode, error } = handleApiError(
        new AuthorizationError("You don't have edit access to this content"),
        "Versions POST"
      )
      return createSecureResponse(error, statusCode)
    }

    // Get the highest version number
    const serverSupabase = createServerSupabaseClient()
    const { data: latestVersion } = await (serverSupabase as any)
      .from("content_versions")
      .select("version_number")
      .eq("content_id", id)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextVersion = latestVersion ? (latestVersion.version_number as number) + 1 : 1

    const body = await request.json()
    const { change_summary } = body

    // Validate change_summary if provided
    let sanitizedChangeSummary: string | null = null
    if (change_summary) {
      const summaryValidation = validateText(change_summary, { maxLength: 500 })
      if (!summaryValidation.isValid) {
        const { statusCode, error } = handleApiError(
          new ValidationError(`Change summary: ${summaryValidation.error}`),
          "Versions POST"
        )
        return createSecureResponse(error, statusCode)
      }
      sanitizedChangeSummary = summaryValidation.sanitized || null
    }

    // Create new version
    const { data: version, error: versionError } = await (serverSupabase as any)
      .from("content_versions")
      .insert({
        content_id: id,
        user_id: session.user.id,
        version_number: nextVersion,
        title: contentData.title,
        content: contentData.content,
        change_summary: sanitizedChangeSummary,
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
      return createSecureResponse(apiError, statusCode)
    }

    logger.info("Content version created", {
      context: "Collaboration",
      userId: session.user.id,
      data: { contentId: id, versionNumber: nextVersion },
    })

    return createSecureResponse({ success: true, version })
  } catch (error) {
    logger.error("Error creating version", {
      context: "Collaboration",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Versions")
    return createSecureResponse(apiError, statusCode)
  }
}

