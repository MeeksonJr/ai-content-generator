import { NextResponse } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { logger } from "@/lib/utils/logger"
import { handleApiError } from "@/lib/utils/error-handler"

/**
 * GET /api/admin/payments
 * Fetch payments for refund management (admin only)
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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "completed"
    const limit = Number.parseInt(searchParams.get("limit") || "100")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

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
      return NextResponse.json(apiError, { status: statusCode })
    }

    logger.info("Fetched payments for refund management", {
      context: "Admin",
      userId: session.user.id,
      data: { count: payments?.length || 0, status },
    })

    return NextResponse.json({ payments: payments || [] })
  } catch (error) {
    logger.error("Error fetching payments", {
      context: "Admin",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Admin Payments")
    return NextResponse.json(apiError, { status: statusCode })
  }
}

