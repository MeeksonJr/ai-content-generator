import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables")
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET() {
  try {
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

    return NextResponse.json({ results: blogPosts || [] })
  } catch (error) {
    console.error("Error fetching blog posts:", error)
    return NextResponse.json(
      { error: "Failed to fetch blog posts", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
