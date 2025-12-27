import { NextResponse } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { logger } from "@/lib/utils/logger"
import { handleApiError } from "@/lib/utils/error-handler"

/**
 * POST /api/templates/[id]/use
 * Use a template (increments usage count)
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

    // Get template
    const serverSupabase = createServerSupabaseClient()
    const { data: template, error: fetchError } = await (serverSupabase as any)
      .from("content_templates")
      .select("*")
      .eq("id", params.id)
      .or(`user_id.eq.${session.user.id},is_public.eq.true`)
      .maybeSingle()

    if (fetchError || !template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    // Increment usage count
    const { data: updatedTemplate, error: updateError } = await (serverSupabase as any)
      .from("content_templates")
      .update({
        usage_count: (template.usage_count || 0) + 1,
      } as any)
      .eq("id", params.id)
      .select()
      .single()

    if (updateError) {
      const { statusCode, error: apiError } = handleApiError(updateError, "Templates")
      return NextResponse.json(apiError, { status: statusCode })
    }

    logger.info("Template used", {
      context: "Templates",
      userId: session.user.id,
      data: { templateId: params.id },
    })

    return NextResponse.json({ success: true, template: updatedTemplate })
  } catch (error) {
    logger.error("Error using template", {
      context: "Templates",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Templates")
    return NextResponse.json(apiError, { status: statusCode })
  }
}

