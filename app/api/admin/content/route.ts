import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { logger } from "@/lib/utils/logger"
import { handleApiError, AuthenticationError, AuthorizationError } from "@/lib/utils/error-handler"
import { createSecureResponse, handlePreflight } from "@/lib/utils/security"
import { PAGINATION } from "@/lib/constants/app.constants"

/**
 * GET /api/admin/content
 * Fetch content for moderation (admin only)
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
      const { statusCode, error } = handleApiError(new AuthenticationError(), "Admin Content GET")
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
        "Admin Content GET"
      )
      return createSecureResponse(error, statusCode)
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "all"
    
    // Validate pagination parameters
    const limit = Math.min(
      PAGINATION.MAX_LIMIT,
      Math.max(1, Number.parseInt(searchParams.get("limit") || String(PAGINATION.DEFAULT_LIMIT)))
    )
    const offset = Math.max(0, Number.parseInt(searchParams.get("offset") || "0"))

    // Validate status parameter
    const validStatuses = ["all", "pending", "approved", "rejected", "flagged"]
    if (!validStatuses.includes(status)) {
      const { statusCode, error } = handleApiError(
        new ValidationError(`Status must be one of: ${validStatuses.join(", ")}`),
        "Admin Content GET"
      )
      return createSecureResponse(error, statusCode)
    }

    // Use server client to bypass RLS
    const serverSupabase = createServerSupabaseClient()
    let query = (serverSupabase as any)
      .from("content")
      .select(`
        *,
        user_profiles (
          display_name,
          email
        )
      `)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (status !== "all") {
      query = query.eq("moderation_status", status)
    }

    const { data: content, error } = await query

    if (error) {
      const { statusCode, error: apiError } = handleApiError(error, "Admin Content")
      return createSecureResponse(apiError, statusCode)
    }

    logger.info("Fetched content for moderation", {
      context: "Admin",
      userId: session.user.id,
      data: { count: content?.length || 0, status },
    })

    return createSecureResponse({ content: content || [] })
  } catch (error) {
    logger.error("Error fetching content for moderation", {
      context: "Admin",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Admin Content")
    return createSecureResponse(apiError, statusCode)
  }
}

