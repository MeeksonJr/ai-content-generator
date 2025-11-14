import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("[SERVER] Test generate API called")

    // Test environment variables
    const hasGroq = !!process.env.GROQ_API_KEY
    const hasGemini = !!process.env.GEMINI_API_KEY
    const hasHuggingFace = !!process.env.HUGGING_FACE_API_KEY
    const hasSupabase =
      !!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) && !!process.env.SUPABASE_SERVICE_ROLE_KEY

    return NextResponse.json({
      message: "Test API is working!",
      environment: {
        hasGroq,
        hasGemini,
        hasHuggingFace,
        hasSupabase,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[SERVER] Test API error:", error)
    return NextResponse.json(
      {
        error: "Test API failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST() {
  try {
    console.log("[SERVER] Test POST API called")

    return NextResponse.json({
      message: "Test POST API is working!",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[SERVER] Test POST API error:", error)
    return NextResponse.json(
      {
        error: "Test POST API failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
