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
 * GET /api/templates/[id]
 * Get a single template
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
        new ValidationError(uuidValidation.error || "Invalid template ID format"),
        "Templates GET"
      )
      return createSecureResponse(error, statusCode)
    }

    const supabase = await createSupabaseRouteClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      const { statusCode, error } = handleApiError(new AuthenticationError(), "Templates GET")
      return createSecureResponse(error, statusCode)
    }

    const serverSupabase = createServerSupabaseClient()
    const { data: template, error } = await (serverSupabase as any)
      .from("content_templates")
      .select(`
        *,
        user_profiles (
          display_name,
          avatar_url
        )
      `)
      .eq("id", id)
      .or(`user_id.eq.${session.user.id},is_public.eq.true`)
      .maybeSingle()

    if (error) {
      const { statusCode, error: apiError } = handleApiError(error, "Templates")
      return createSecureResponse(apiError, statusCode)
    }

    if (!template) {
      const { statusCode, error } = handleApiError(new NotFoundError("Template not found"), "Templates GET")
      return createSecureResponse(error, statusCode)
    }

    return createSecureResponse({ template })
  } catch (error) {
    logger.error("Error fetching template", {
      context: "Templates",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Templates")
    return createSecureResponse(apiError, statusCode)
  }
}

/**
 * PATCH /api/templates/[id]
 * Update a template
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
        new ValidationError(uuidValidation.error || "Invalid template ID format"),
        "Templates PATCH"
      )
      return createSecureResponse(error, statusCode)
    }

    const supabase = await createSupabaseRouteClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      const { statusCode, error } = handleApiError(new AuthenticationError(), "Templates PATCH")
      return createSecureResponse(error, statusCode)
    }

    // Check if user owns the template
    const serverSupabase = createServerSupabaseClient()
    const { data: existingTemplate } = await (serverSupabase as any)
      .from("content_templates")
      .select("user_id")
      .eq("id", id)
      .maybeSingle()

    if (!existingTemplate) {
      const { statusCode, error } = handleApiError(new NotFoundError("Template not found"), "Templates PATCH")
      return createSecureResponse(error, statusCode)
    }

    const templateData = existingTemplate as { user_id: string }
    if (templateData.user_id !== session.user.id) {
      const { statusCode, error } = handleApiError(
        new AuthorizationError("You can only update your own templates"),
        "Templates PATCH"
      )
      return createSecureResponse(error, statusCode)
    }

    const body = await request.json()
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    // Validate and sanitize fields if provided
    if (body.name !== undefined) {
      const nameValidation = validateText(body.name, { minLength: 1, maxLength: API_CONFIG.MAX_TITLE_LENGTH })
      if (!nameValidation.isValid) {
        const { statusCode, error } = handleApiError(
          new ValidationError(`Name: ${nameValidation.error}`),
          "Templates PATCH"
        )
        return createSecureResponse(error, statusCode)
      }
      updateData.name = nameValidation.sanitized
    }

    if (body.description !== undefined && body.description) {
      const descValidation = validateText(body.description, { maxLength: API_CONFIG.MAX_DESCRIPTION_LENGTH })
      if (!descValidation.isValid) {
        const { statusCode, error } = handleApiError(
          new ValidationError(`Description: ${descValidation.error}`),
          "Templates PATCH"
        )
        return createSecureResponse(error, statusCode)
      }
      updateData.description = descValidation.sanitized
    }

    if (body.content_type !== undefined) updateData.content_type = body.content_type
    if (body.template_content !== undefined) {
      const contentValidation = validateText(body.template_content, {
        minLength: 1,
        maxLength: API_CONFIG.MAX_CONTENT_LENGTH,
      })
      if (!contentValidation.isValid) {
        const { statusCode, error } = handleApiError(
          new ValidationError(`Template content: ${contentValidation.error}`),
          "Templates PATCH"
        )
        return createSecureResponse(error, statusCode)
      }
      updateData.template_content = contentValidation.sanitized
    }

    if (body.template_prompt !== undefined && body.template_prompt) {
      const promptValidation = validateText(body.template_prompt, { maxLength: API_CONFIG.MAX_CONTENT_LENGTH })
      if (!promptValidation.isValid) {
        const { statusCode, error } = handleApiError(
          new ValidationError(`Template prompt: ${promptValidation.error}`),
          "Templates PATCH"
        )
        return createSecureResponse(error, statusCode)
      }
      updateData.template_prompt = promptValidation.sanitized
    }

    if (body.variables !== undefined) updateData.variables = body.variables
    if (body.is_public !== undefined) updateData.is_public = body.is_public
    if (body.category !== undefined) updateData.category = body.category
    if (body.tags !== undefined) updateData.tags = body.tags

    const { data: template, error } = await (serverSupabase as any)
      .from("content_templates")
      .update(updateData as any)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      const { statusCode, error: apiError } = handleApiError(error, "Templates")
      return createSecureResponse(apiError, statusCode)
    }

    logger.info("Updated content template", {
      context: "Templates",
      userId: session.user.id,
      data: { templateId: id },
    })

    return createSecureResponse({ success: true, template })
  } catch (error) {
    logger.error("Error updating template", {
      context: "Templates",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Templates")
    return createSecureResponse(apiError, statusCode)
  }
}

/**
 * DELETE /api/templates/[id]
 * Delete a template
 */
export async function DELETE(
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
        "Templates DELETE"
      )
      return createSecureResponse(error, statusCode)
    }

    const supabase = await createSupabaseRouteClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      const { statusCode, error } = handleApiError(new AuthenticationError(), "Templates DELETE")
      return createSecureResponse(error, statusCode)
    }

    // Check if user owns the template
    const serverSupabase = createServerSupabaseClient()
    const { data: existingTemplate } = await (serverSupabase as any)
      .from("content_templates")
      .select("user_id")
      .eq("id", id)
      .maybeSingle()

    if (!existingTemplate) {
      const { statusCode, error } = handleApiError(new NotFoundError("Template not found"), "Templates DELETE")
      return createSecureResponse(error, statusCode)
    }

    const templateData = existingTemplate as { user_id: string }
    if (templateData.user_id !== session.user.id) {
      const { statusCode, error } = handleApiError(
        new AuthorizationError("You can only delete your own templates"),
        "Templates DELETE"
      )
      return createSecureResponse(error, statusCode)
    }

    const { error } = await (serverSupabase as any)
      .from("content_templates")
      .delete()
      .eq("id", id)

    if (error) {
      const { statusCode, error: apiError } = handleApiError(error, "Templates")
      return createSecureResponse(apiError, statusCode)
    }

    logger.info("Deleted content template", {
      context: "Templates",
      userId: session.user.id,
      data: { templateId: id },
    })

    return createSecureResponse({ success: true })
  } catch (error) {
    logger.error("Error deleting template", {
      context: "Templates",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Templates")
    return createSecureResponse(apiError, statusCode)
  }
}

