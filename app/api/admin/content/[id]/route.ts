import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { logger } from "@/lib/utils/logger"
import { handleApiError, AuthenticationError, AuthorizationError, ValidationError, NotFoundError } from "@/lib/utils/error-handler"
import { validateUuid, validateText } from "@/lib/utils/validation"
import { createSecureResponse, handlePreflight } from "@/lib/utils/security"
import { STATUS } from "@/lib/constants/app.constants"

/**
 * PATCH /api/admin/content/[id]
 * Update content moderation status (admin only)
 */
export async function PATCH(
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
        "Admin Content PATCH"
      )
      return createSecureResponse(error, statusCode)
    }

    const supabase = await createSupabaseRouteClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      const { statusCode, error } = handleApiError(new AuthenticationError(), "Admin Content PATCH")
      return createSecureResponse(error, statusCode)
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("id", session.user.id)
      .maybeSingle()

    const isAdmin = (profile as { is_admin?: boolean } | null)?.is_admin || false

    if (!isAdmin) {
      const { statusCode, error } = handleApiError(
        new AuthorizationError("Admin access required"),
        "Admin Content PATCH"
      )
      return createSecureResponse(error, statusCode)
    }

    const body = await request.json()
    const { status, notes } = body

    // Validate status
    const validStatuses = ["pending", "approved", "rejected", "flagged"]
    if (!status || !validStatuses.includes(status)) {
      const { statusCode, error } = handleApiError(
        new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(", ")}`),
        "Admin Content PATCH"
      )
      return createSecureResponse(error, statusCode)
    }

    // Validate notes if provided
    if (notes) {
      const notesValidation = validateText(notes, { maxLength: 2000 })
      if (!notesValidation.isValid) {
        const { statusCode, error } = handleApiError(
          new ValidationError(`Notes: ${notesValidation.error}`),
          "Admin Content PATCH"
        )
        return createSecureResponse(error, statusCode)
      }
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
      .eq("id", id)
      .select()
      .single()

    if (error) {
      const { statusCode, error: apiError } = handleApiError(error, "Admin Content")
      return createSecureResponse(apiError, statusCode)
    }

    if (!content) {
      const { statusCode, error } = handleApiError(
        new NotFoundError("Content not found"),
        "Admin Content PATCH"
      )
      return createSecureResponse(error, statusCode)
    }

    logger.info("Updated content moderation status", {
      context: "Admin",
      userId: session.user.id,
      data: { contentId: id, status },
    })

    return createSecureResponse({ success: true, content })
  } catch (error) {
    logger.error("Error updating content moderation status", {
      context: "Admin",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Admin Content")
    return createSecureResponse(apiError, statusCode)
  }
}

