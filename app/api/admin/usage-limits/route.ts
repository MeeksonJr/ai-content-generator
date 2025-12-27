import { NextResponse } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { logger } from "@/lib/utils/logger"
import { handleApiError } from "@/lib/utils/error-handler"

/**
 * GET /api/admin/usage-limits
 * Fetch all usage limits (admin only)
 */
export async function GET() {
  try {
    const supabase = await createSupabaseRouteClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("id", session.user.id)
      .maybeSingle()

    const isAdmin = (profile as { is_admin?: boolean } | null)?.is_admin || false

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
    }

    // Use server client to bypass RLS if needed
    const serverSupabase = createServerSupabaseClient()
    const { data: usageLimits, error } = await serverSupabase.from("usage_limits").select("*").order("plan_type")

    if (error) {
      const { statusCode, error: apiError } = handleApiError(error, "Usage Limits")
      return NextResponse.json(apiError, { status: statusCode })
    }

    logger.info("Fetched usage limits", {
      context: "Admin",
      userId: session.user.id,
      data: { count: usageLimits?.length || 0 },
    })

    return NextResponse.json({ usageLimits: usageLimits || [] })
  } catch (error) {
    logger.error("Error fetching usage limits", {
      context: "Admin",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Usage Limits")
    return NextResponse.json(apiError, { status: statusCode })
  }
}

/**
 * PUT /api/admin/usage-limits
 * Update usage limits (admin only)
 */
export async function PUT(request: Request) {
  try {
    const supabase = await createSupabaseRouteClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("id", session.user.id)
      .maybeSingle()

    const isAdmin = (profile as { is_admin?: boolean } | null)?.is_admin || false

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { usageLimits } = body

    if (!usageLimits || !Array.isArray(usageLimits)) {
      return NextResponse.json({ error: "usageLimits array is required" }, { status: 400 })
    }

    // Use server client to bypass RLS
    const serverSupabase = createServerSupabaseClient()
    const results = []

    for (const limit of usageLimits) {
      const { plan_type, monthly_content_limit, max_content_length, sentiment_analysis_enabled, keyword_extraction_enabled, text_summarization_enabled, api_access_enabled } = limit

      if (!plan_type) {
        continue
      }

      // Check if limit exists
      const { data: existing } = await serverSupabase
        .from("usage_limits")
        .select("id")
        .eq("plan_type", plan_type)
        .maybeSingle()

      const limitData = {
        plan_type,
        monthly_content_limit: monthly_content_limit ?? 0,
        max_content_length: max_content_length ?? 0,
        sentiment_analysis_enabled: sentiment_analysis_enabled ?? false,
        keyword_extraction_enabled: keyword_extraction_enabled ?? false,
        text_summarization_enabled: text_summarization_enabled ?? false,
        api_access_enabled: api_access_enabled ?? false,
      }

      if (existing) {
        // Update existing
        const { data, error } = await (serverSupabase as any)
          .from("usage_limits")
          .update(limitData as any)
          .eq("plan_type", plan_type)
          .select()
          .single()

        if (error) {
          logger.error("Error updating usage limit", {
            context: "Admin",
            userId: session.user.id,
          }, error)
          results.push({ plan_type, error: error.message })
        } else {
          results.push({ plan_type, success: true, data })
        }
      } else {
        // Insert new
        const { data, error } = await (serverSupabase as any)
          .from("usage_limits")
          .insert(limitData as any)
          .select()
          .single()

        if (error) {
          logger.error("Error creating usage limit", {
            context: "Admin",
            userId: session.user.id,
          }, error)
          results.push({ plan_type, error: error.message })
        } else {
          results.push({ plan_type, success: true, data })
        }
      }
    }

    logger.info("Updated usage limits", {
      context: "Admin",
      userId: session.user.id,
      data: { count: results.length },
    })

    return NextResponse.json({ success: true, results })
  } catch (error) {
    logger.error("Error updating usage limits", {
      context: "Admin",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Usage Limits")
    return NextResponse.json(apiError, { status: statusCode })
  }
}

