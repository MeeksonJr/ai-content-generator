import { NextResponse } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { logger } from "@/lib/utils/logger"
import { handleApiError } from "@/lib/utils/error-handler"

/**
 * GET /api/templates
 * Fetch content templates
 */
export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseRouteClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const contentType = searchParams.get("content_type")
    const category = searchParams.get("category")
    const search = searchParams.get("search")
    const includePublic = searchParams.get("include_public") !== "false"
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    // Build query
    const serverSupabase = createServerSupabaseClient()
    let query = (serverSupabase as any)
      .from("content_templates")
      .select(`
        *,
        user_profiles!content_templates_user_id_fkey (
          display_name,
          avatar_url
        )
      `)

    // Build the OR condition for user access
    if (includePublic) {
      query = query.or(`user_id.eq.${session.user.id},is_public.eq.true`)
    } else {
      query = query.eq("user_id", session.user.id)
    }

    // Apply filters
    if (contentType) {
      query = query.eq("content_type", contentType)
    }

    if (category) {
      query = query.eq("category", category)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // Apply ordering and pagination
    query = query
      .order("is_featured", { ascending: false })
      .order("usage_count", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: templates, error } = await query

    if (error) {
      const { statusCode, error: apiError } = handleApiError(error, "Templates")
      return NextResponse.json(apiError, { status: statusCode })
    }

    logger.info("Fetched content templates", {
      context: "Templates",
      userId: session.user.id,
      data: { count: templates?.length || 0 },
    })

    return NextResponse.json({ templates: templates || [] })
  } catch (error) {
    logger.error("Error fetching templates", {
      context: "Templates",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Templates")
    return NextResponse.json(apiError, { status: statusCode })
  }
}

/**
 * POST /api/templates
 * Create a new content template
 */
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseRouteClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, content_type, template_content, template_prompt, variables, is_public, category, tags } = body

    if (!name || !content_type || !template_content) {
      return NextResponse.json(
        { error: "Name, content_type, and template_content are required" },
        { status: 400 }
      )
    }

    const serverSupabase = createServerSupabaseClient()
    const { data: template, error } = await (serverSupabase as any)
      .from("content_templates")
      .insert({
        user_id: session.user.id,
        name,
        description: description || null,
        content_type,
        template_content,
        template_prompt: template_prompt || null,
        variables: variables || null,
        is_public: is_public || false,
        category: category || null,
        tags: tags || null,
      } as any)
      .select()
      .single()

    if (error) {
      const { statusCode, error: apiError } = handleApiError(error, "Templates")
      return NextResponse.json(apiError, { status: statusCode })
    }

    logger.info("Created content template", {
      context: "Templates",
      userId: session.user.id,
      data: { templateId: template.id, name },
    })

    return NextResponse.json({ success: true, template })
  } catch (error) {
    logger.error("Error creating template", {
      context: "Templates",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Templates")
    return NextResponse.json(apiError, { status: statusCode })
  }
}

