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

    // Get filter parameters
    const search = searchParams.get("search")?.trim() || null
    const category = searchParams.get("category")?.trim() || null
    const sort = searchParams.get("sort") || "newest" // newest, oldest, most_viewed, alphabetical
    const dateFrom = searchParams.get("dateFrom") || null
    const dateTo = searchParams.get("dateTo") || null

    // Build count query
    let countQuery = supabase.from("blog_content").select("*", { count: "exact", head: true }).eq("is_published", true)

    // Apply search filter
    if (search) {
      countQuery = countQuery.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%,content.ilike.%${search}%,search_query.ilike.%${search}%`)
    }

    // Apply category filter
    if (category) {
      countQuery = countQuery.eq("category", category)
    }

    // Apply date range filter
    if (dateFrom) {
      countQuery = countQuery.gte("created_at", dateFrom)
    }
    if (dateTo) {
      countQuery = countQuery.lte("created_at", dateTo)
    }

    // Get total count with filters
    const { count, error: countError } = await countQuery

    if (countError) {
      console.error("Database count error:", countError)
      return createSecureResponse({ error: "Database error", details: countError.message }, 500)
    }

    const total = count || 0
    const pagination = calculatePagination({ page, limit, total })

    // Build data query
    let query = supabase.from("blog_content").select("*").eq("is_published", true)

    // Apply filters again
    if (search) {
      query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%,content.ilike.%${search}%,search_query.ilike.%${search}%`)
    }
    if (category) {
      query = query.eq("category", category)
    }
    if (dateFrom) {
      query = query.gte("created_at", dateFrom)
    }
    if (dateTo) {
      query = query.lte("created_at", dateTo)
    }

    // Apply sorting
    switch (sort) {
      case "oldest":
        query = query.order("created_at", { ascending: true })
        break
      case "most_viewed":
        query = query.order("view_count", { ascending: false })
        break
      case "alphabetical":
        query = query.order("title", { ascending: true })
        break
      case "newest":
      default:
        query = query.order("created_at", { ascending: false })
        break
    }

    // Apply pagination
    const { data: blogPosts, error } = await query.range(pagination.offset, pagination.offset + pagination.limit - 1)

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
