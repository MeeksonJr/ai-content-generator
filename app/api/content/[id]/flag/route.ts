import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { logger } from "@/lib/utils/logger"
import { handleApiError, AuthenticationError, ValidationError, NotFoundError } from "@/lib/utils/error-handler"
import { validateUuid, validateText } from "@/lib/utils/validation"
import { createSecureResponse, handlePreflight } from "@/lib/utils/security"
import { API_CONFIG } from "@/lib/constants/app.constants"

/**
 * POST /api/content/[id]/flag
 * Flag content as inappropriate (any authenticated user)
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
        "Flag Content"
      )
      return createSecureResponse(error, statusCode)
    }

    const supabase = await createSupabaseRouteClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      const { statusCode, error } = handleApiError(new AuthenticationError(), "Flag Content")
      return createSecureResponse(error, statusCode)
    }

    const body = await request.json()
    const { reason } = body

    // Validate reason if provided
    let sanitizedReason: string | null = null
    if (reason) {
      const reasonValidation = validateText(reason, { maxLength: 500 })
      if (!reasonValidation.isValid) {
        const { statusCode, error } = handleApiError(
          new ValidationError(`Reason: ${reasonValidation.error}`),
          "Flag Content"
        )
        return createSecureResponse(error, statusCode)
      }
      sanitizedReason = reasonValidation.sanitized || null
    }

    // Use server client to bypass RLS for update
    const serverSupabase = createServerSupabaseClient()
    
    // First, check if content exists and belongs to user or is public
    const { data: content, error: fetchError } = await (serverSupabase as any)
      .from("content")
      .select("id, user_id, moderation_status")
      .eq("id", id)
      .maybeSingle()

    if (fetchError || !content) {
      const { statusCode, error } = handleApiError(new NotFoundError("Content not found"), "Flag Content")
      return createSecureResponse(error, statusCode)
    }

    // Update content with flag information
    const updateData: any = {
      moderation_status: "flagged",
      flagged_at: new Date().toISOString(),
      flagged_by: session.user.id,
    }

    if (sanitizedReason) {
      updateData.flag_reason = sanitizedReason
    }

    const { data: updatedContent, error: updateError } = await (serverSupabase as any)
      .from("content")
      .update(updateData as any)
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      const { statusCode, error: apiError } = handleApiError(updateError, "Flag Content")
      return createSecureResponse(apiError, statusCode)
    }

    logger.info("Content flagged", {
      context: "Content Moderation",
      userId: session.user.id,
      data: { contentId: id, reason: sanitizedReason },
    })

    return createSecureResponse({ success: true, content: updatedContent })
  } catch (error) {
    logger.error("Error flagging content", {
      context: "Content Moderation",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Flag Content")
    return createSecureResponse(apiError, statusCode)
  }
}

