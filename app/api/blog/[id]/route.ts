import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/utils/supabase-env"
import { logger } from "@/lib/utils/logger"

const supabaseUrl = getSupabaseUrl()
const supabaseServiceKey = getSupabaseServiceRoleKey()

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables")
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: "Invalid blog post ID" }, { status: 400 })
    }

    // Fetch blog post by ID
    const { data: blogPost, error } = await supabase
      .from("blog_content")
      .select("*")
      .eq("id", id)
      .eq("is_published", true)
      .maybeSingle()

    if (error) {
      logger.error("Database error fetching blog post", {
        context: "BlogPostAPI",
        data: { id, error },
      })
      return NextResponse.json({ error: "Database error", details: error.message }, { status: 500 })
    }

    if (!blogPost) {
      return NextResponse.json({ error: "Blog post not found" }, { status: 404 })
    }

    // Increment view count
    await supabase
      .from("blog_content")
      .update({ view_count: (blogPost.view_count || 0) + 1 })
      .eq("id", blogPost.id)

    return NextResponse.json({ post: blogPost })
  } catch (error) {
    logger.error("Error in blog ID API", {
      context: "BlogPostAPI",
      data: { error },
    })
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
