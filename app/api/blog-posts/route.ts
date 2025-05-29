import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  try {
    console.log("GET /api/blog-posts - Fetching blog posts")

    const { data: blogPosts, error } = await supabase
      .from("blog_content")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(20)

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Database error", details: error.message }, { status: 500 })
    }

    console.log(`Successfully fetched ${blogPosts?.length || 0} blog posts`)
    return NextResponse.json({ results: blogPosts || [] })
  } catch (error) {
    console.error("Error fetching blog posts:", error)
    return NextResponse.json(
      { error: "Failed to fetch blog posts", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
