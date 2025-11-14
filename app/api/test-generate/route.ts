import { NextResponse } from "next/server"
import { logger } from "@/lib/utils/logger"
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/utils/supabase-env"

export async function GET() {
  try {
    // Test environment variables
    const hasGroq = !!process.env.GROQ_API_KEY
    const hasGemini = !!process.env.GEMINI_API_KEY
    const hasHuggingFace = !!process.env.HUGGING_FACE_API_KEY
    const hasSupabase = !!getSupabaseUrl() && !!getSupabaseServiceRoleKey()

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
    logger.error("Test generate API error", {
      context: "Diagnostics",
      data: { error },
    })
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
    return NextResponse.json({
      message: "Test POST API is working!",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error("Test generate POST API error", {
      context: "Diagnostics",
      data: { error },
    })
    return NextResponse.json(
      {
        error: "Test POST API failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
