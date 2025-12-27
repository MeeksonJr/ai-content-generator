import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { logger } from "@/lib/utils/logger"
import { handleApiError, AuthenticationError, ValidationError } from "@/lib/utils/error-handler"
import { validateText } from "@/lib/utils/validation"
import { createSecureResponse, handlePreflight } from "@/lib/utils/security"
import { PAGINATION, API_CONFIG } from "@/lib/constants/app.constants"

/**
 * GET /api/templates
 * Fetch content templates
 */
export async function GET(request: NextRequest) {
  try {
    // Handle preflight OPTIONS request
    const preflightResponse = handlePreflight(request)
    if (preflightResponse) return preflightResponse

    const supabase = await createSupabaseRouteClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      const { statusCode, error } = handleApiError(new AuthenticationError(), "Templates GET")
      return createSecureResponse(error, statusCode)
    }

    const { searchParams } = new URL(request.url)
    const contentType = searchParams.get("content_type")
    const category = searchParams.get("category")
    const search = searchParams.get("search")
    const includePublic = searchParams.get("include_public") !== "false"
    
    // Validate and sanitize pagination parameters
    const limit = Math.min(
      PAGINATION.MAX_LIMIT,
      Math.max(1, Number.parseInt(searchParams.get("limit") || String(PAGINATION.DEFAULT_LIMIT)))
    )
    const offset = Math.max(0, Number.parseInt(searchParams.get("offset") || "0"))

    // Validate search query if provided
    if (search) {
      const searchValidation = validateText(search, {
        maxLength: 100,
      })
      if (!searchValidation.isValid) {
        const { statusCode, error } = handleApiError(
          new ValidationError(`Search query: ${searchValidation.error}`),
          "Templates GET"
        )
        return createSecureResponse(error, statusCode)
      }
    }

    // Build query
    const serverSupabase = createServerSupabaseClient()
    let query = (serverSupabase as any)
      .from("content_templates")
      .select(`
        *,
        user_profiles (
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
      return createSecureResponse(apiError, statusCode)
    }

    logger.info("Fetched content templates", {
      context: "Templates",
      userId: session.user.id,
      data: { count: templates?.length || 0 },
    })

    return createSecureResponse({ templates: templates || [] })
  } catch (error) {
    logger.error("Error fetching templates", {
      context: "Templates",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Templates")
    return createSecureResponse(apiError, statusCode)
  }
}

/**
 * POST /api/templates
 * Create a new content template
 */
export async function POST(request: NextRequest) {
  try {
    // Handle preflight OPTIONS request
    const preflightResponse = handlePreflight(request)
    if (preflightResponse) return preflightResponse

    const supabase = await createSupabaseRouteClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      const { statusCode, error } = handleApiError(new AuthenticationError(), "Templates POST")
      return createSecureResponse(error, statusCode)
    }

    const body = await request.json()
    const { name, description, content_type, template_content, template_prompt, variables, is_public, category, tags } = body

    // Validate required fields
    const nameValidation = validateText(name, {
      minLength: 1,
      maxLength: API_CONFIG.MAX_TITLE_LENGTH,
      required: true,
    })

    const contentValidation = validateText(template_content, {
      minLength: 1,
      maxLength: API_CONFIG.MAX_CONTENT_LENGTH,
      required: true,
    })

    if (!nameValidation.isValid || !contentValidation.isValid || !content_type) {
      const errors = []
      if (!nameValidation.isValid) errors.push(`Name: ${nameValidation.error}`)
      if (!contentValidation.isValid) errors.push(`Template content: ${contentValidation.error}`)
      if (!content_type) errors.push("Content type is required")

      const { statusCode, error } = handleApiError(
        new ValidationError(errors.join(", ")),
        "Templates POST"
      )
      return createSecureResponse(error, statusCode)
    }

    // Validate description if provided
    if (description) {
      const descValidation = validateText(description, {
        maxLength: API_CONFIG.MAX_DESCRIPTION_LENGTH,
      })
      if (!descValidation.isValid) {
        const { statusCode, error } = handleApiError(
          new ValidationError(`Description: ${descValidation.error}`),
          "Templates POST"
        )
        return createSecureResponse(error, statusCode)
      }
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

