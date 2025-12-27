import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { logger } from "@/lib/utils/logger"
import { handleApiError, AuthenticationError, ValidationError, NotFoundError, AuthorizationError } from "@/lib/utils/error-handler"
import { validateUuid } from "@/lib/utils/validation"
import { createSecureResponse, handlePreflight } from "@/lib/utils/security"

/**
 * POST /api/templates/[id]/use
 * Use a template (increments usage count)
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
        new ValidationError(uuidValidation.error || "Invalid template ID format"),
        "Template Use POST"
      )
      return createSecureResponse(error, statusCode)
    }

    const supabase = await createSupabaseRouteClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      const { statusCode, error } = handleApiError(new AuthenticationError(), "Template Use POST")
      return createSecureResponse(error, statusCode)
    }

    // Get template
    const serverSupabase = createServerSupabaseClient()
    const { data: template, error: fetchError } = await (serverSupabase as any)
      .from("content_templates")
      .select("*")
      .eq("id", id)
      .or(`user_id.eq.${session.user.id},is_public.eq.true`)
      .maybeSingle()

    if (fetchError || !template) {
      const { statusCode, error } = handleApiError(
        fetchError || new NotFoundError("Template not found"),
        "Template Use POST"
      )
      return createSecureResponse(error, statusCode)
    }

    // Increment usage count
    const { data: updatedTemplate, error: updateError } = await (serverSupabase as any)
      .from("content_templates")
      .update({
        usage_count: (template.usage_count || 0) + 1,
      } as any)
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      const { statusCode, error: apiError } = handleApiError(updateError, "Templates")
      return createSecureResponse(apiError, statusCode)
    }

    logger.info("Template used", {
      context: "Templates",
      userId: session.user.id,
      data: { templateId: id },
    })

    return createSecureResponse({ success: true, template: updatedTemplate })
  } catch (error) {
    logger.error("Error using template", {
      context: "Templates",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Templates")
    return createSecureResponse(apiError, statusCode)
  }
}

