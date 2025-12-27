import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { logger } from "@/lib/utils/logger"
import { handleApiError, AuthenticationError, AuthorizationError, ValidationError } from "@/lib/utils/error-handler"
import { validateNumber } from "@/lib/utils/validation"
import { createSecureResponse, handlePreflight } from "@/lib/utils/security"
import { PAGINATION, STATUS } from "@/lib/constants/app.constants"

/**
 * GET /api/admin/payments
 * Fetch payments for refund management (admin only)
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
      const { statusCode, error } = handleApiError(new AuthenticationError(), "Admin Payments GET")
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
        "Admin Payments GET"
      )
      return createSecureResponse(error, statusCode)
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "completed"
    
    // Validate pagination parameters
    const limit = Math.min(
      PAGINATION.MAX_LIMIT,
      Math.max(1, Number.parseInt(searchParams.get("limit") || "100"))
    )
    const offset = Math.max(0, Number.parseInt(searchParams.get("offset") || "0"))

    // Validate status parameter
    const validStatuses = ["completed", "pending", "failed", "refunded", "cancelled"]
    if (status && !validStatuses.includes(status)) {
      const { statusCode, error } = handleApiError(
        new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(", ")}`),
        "Admin Payments GET"
      )
      return createSecureResponse(error, statusCode)
    }

    // Use server client to bypass RLS
    const serverSupabase = createServerSupabaseClient()
    let query = (serverSupabase as any)
      .from("payment_history")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq("status", status)
    }

    const { data: payments, error } = await query

    if (error) {
      const { statusCode, error: apiError } = handleApiError(error, "Admin Payments")
      return createSecureResponse(apiError, statusCode)
    }

    logger.info("Fetched payments for refund management", {
      context: "Admin",
      userId: session.user.id,
      data: { count: payments?.length || 0, status },
    })

    return createSecureResponse({ payments: payments || [] })
  } catch (error) {
    logger.error("Error fetching payments", {
      context: "Admin",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Admin Payments")
    return createSecureResponse(apiError, statusCode)
  }
}

