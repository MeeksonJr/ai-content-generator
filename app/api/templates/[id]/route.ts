import { NextResponse } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { logger } from "@/lib/utils/logger"
import { handleApiError } from "@/lib/utils/error-handler"

/**
 * GET /api/templates/[id]
 * Get a single template
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

    const serverSupabase = createServerSupabaseClient()
    const { data: template, error } = await (serverSupabase as any)
      .from("content_templates")
      .select(`
        *,
        user_profiles!content_templates_user_id_fkey (
          display_name,
          avatar_url
        )
      `)
      .eq("id", params.id)
      .or(`user_id.eq.${session.user.id},is_public.eq.true`)
      .maybeSingle()

    if (error) {
      const { statusCode, error: apiError } = handleApiError(error, "Templates")
      return NextResponse.json(apiError, { status: statusCode })
    }

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    return NextResponse.json({ template })
  } catch (error) {
    logger.error("Error fetching template", {
      context: "Templates",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Templates")
    return NextResponse.json(apiError, { status: statusCode })
  }
}

/**
 * PATCH /api/templates/[id]
 * Update a template
 */
export async function PATCH(
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

    // Check if user owns the template
    const serverSupabase = createServerSupabaseClient()
    const { data: existingTemplate } = await (serverSupabase as any)
      .from("content_templates")
      .select("user_id")
      .eq("id", params.id)
      .maybeSingle()

    if (!existingTemplate) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    const templateData = existingTemplate as { user_id: string }
    if (templateData.user_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden - You can only update your own templates" }, { status: 403 })
    }

    const body = await request.json()
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.content_type !== undefined) updateData.content_type = body.content_type
    if (body.template_content !== undefined) updateData.template_content = body.template_content
    if (body.template_prompt !== undefined) updateData.template_prompt = body.template_prompt
    if (body.variables !== undefined) updateData.variables = body.variables
    if (body.is_public !== undefined) updateData.is_public = body.is_public
    if (body.category !== undefined) updateData.category = body.category
    if (body.tags !== undefined) updateData.tags = body.tags
    const { data: template, error } = await (serverSupabase as any)
      .from("content_templates")
      .update(updateData as any)
      .eq("id", params.id)
      .select()
      .single()

    if (error) {
      const { statusCode, error: apiError } = handleApiError(error, "Templates")
      return NextResponse.json(apiError, { status: statusCode })
    }

    logger.info("Updated content template", {
      context: "Templates",
      userId: session.user.id,
      data: { templateId: params.id },
    })

    return NextResponse.json({ success: true, template })
  } catch (error) {
    logger.error("Error updating template", {
      context: "Templates",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Templates")
    return NextResponse.json(apiError, { status: statusCode })
  }
}

/**
 * DELETE /api/templates/[id]
 * Delete a template
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

    // Check if user owns the template
    const serverSupabase = createServerSupabaseClient()
    const { data: existingTemplate } = await (serverSupabase as any)
      .from("content_templates")
      .select("user_id")
      .eq("id", params.id)
      .maybeSingle()

    if (!existingTemplate) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    const templateData = existingTemplate as { user_id: string }
    if (templateData.user_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden - You can only delete your own templates" }, { status: 403 })
    }
    const { error } = await (serverSupabase as any)
      .from("content_templates")
      .delete()
      .eq("id", params.id)

    if (error) {
      const { statusCode, error: apiError } = handleApiError(error, "Templates")
      return NextResponse.json(apiError, { status: statusCode })
    }

    logger.info("Deleted content template", {
      context: "Templates",
      userId: session.user.id,
      data: { templateId: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error("Error deleting template", {
      context: "Templates",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Templates")
    return NextResponse.json(apiError, { status: statusCode })
  }
}

