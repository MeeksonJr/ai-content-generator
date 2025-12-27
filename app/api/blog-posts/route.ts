import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/utils/supabase-env"
import { createSecureResponse, handlePreflight } from "@/lib/utils/security"
import { calculatePagination } from "@/lib/utils/pagination"
import { PAGINATION } from "@/lib/constants/app.constants"

const supabaseUrl = getSupabaseUrl()
const supabaseServiceKey = getSupabaseServiceRoleKey()

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables")
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    // Handle preflight OPTIONS request
    const preflightResponse = handlePreflight(request)
    if (preflightResponse) return preflightResponse

    // Get pagination parameters
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || String(PAGINATION.DEFAULT_PAGE)))
    const limit = Math.min(
      PAGINATION.MAX_LIMIT,
      Math.max(1, Number.parseInt(searchParams.get("limit") || String(PAGINATION.DEFAULT_LIMIT)))
    )

    // Get total count
    const { count, error: countError } = await supabase
      .from("blog_content")
      .select("*", { count: "exact", head: true })
      .eq("is_published", true)

    if (countError) {
      console.error("Database count error:", countError)
      return createSecureResponse({ error: "Database error", details: countError.message }, 500)
    }

    const total = count || 0
    const pagination = calculatePagination({ page, limit, total })

    // Fetch blog posts with pagination
    const { data: blogPosts, error } = await supabase
      .from("blog_content")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .range(pagination.offset, pagination.offset + pagination.limit - 1)

    if (error) {
      console.error("Database error:", error)
      return createSecureResponse({ error: "Database error", details: error.message }, 500)
    }

    return createSecureResponse({
      results: blogPosts || [],
      pagination: {
        currentPage: pagination.currentPage,
        totalPages: pagination.totalPages,
        totalItems: total,
        hasNextPage: pagination.hasNextPage,
        hasPreviousPage: pagination.hasPreviousPage,
        limit: pagination.limit,
      },
    })
  } catch (error) {
    console.error("Error fetching blog posts:", error)
    return createSecureResponse(
      { error: "Failed to fetch blog posts", details: error instanceof Error ? error.message : "Unknown error" },
      500
    )
  }
}
