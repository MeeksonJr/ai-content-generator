import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables")
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    console.log("Blog ID API called with:", id)

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      console.log("Invalid UUID format:", id)
      return NextResponse.json({ error: "Invalid blog post ID" }, { status: 400 })
    }

    console.log("Fetching blog post with ID:", id)

    // Fetch blog post by ID
    const { data: blogPost, error } = await supabase
      .from("blog_content")
      .select("*")
      .eq("id", id)
      .eq("is_published", true)
      .maybeSingle()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Database error", details: error.message }, { status: 500 })
    }

    if (!blogPost) {
      console.log("Blog post not found for ID:", id)
      return NextResponse.json({ error: "Blog post not found" }, { status: 404 })
    }

    // Increment view count
    await supabase
      .from("blog_content")
      .update({ view_count: (blogPost.view_count || 0) + 1 })
      .eq("id", blogPost.id)

    console.log("Successfully fetched blog post:", blogPost.id, "with title:", blogPost.title)
    return NextResponse.json({ post: blogPost })
  } catch (error) {
    console.error("Error in blog ID API:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
