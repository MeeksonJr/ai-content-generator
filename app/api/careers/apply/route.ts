import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/utils/logger"

export async function POST(request: Request) {
  try {
    const supabase = createClient()

    // Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const body = await request.json()
    const { fullName, email, position, coverLetter, resumeUrl, phoneNumber, linkedinUrl, portfolioUrl, experience } =
      body

    // Validate required fields
    if (!fullName || !email || !position || !resumeUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Insert application into database
    const { data: application, error } = await supabase
      .from("applications")
      .insert({
        full_name: fullName,
        email: email,
        position_applied: position,
        cover_letter: coverLetter,
        resume_url: resumeUrl,
        phone_number: phoneNumber,
        linkedin_url: linkedinUrl,
        portfolio_url: portfolioUrl,
        years_experience: experience,
        user_id: user.id,
        status: "pending",
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      logger.error("Error saving application:", error)
      return NextResponse.json({ error: "Failed to save application" }, { status: 500 })
    }

    logger.info("Application submitted successfully", {
      context: "Careers",
      data: {
        applicationId: application.id,
        position: position,
        email: email,
        userId: user.id,
      },
    })

    return NextResponse.json({
      message: "Application submitted successfully",
      applicationId: application.id,
    })
  } catch (error) {
    logger.error("Error in careers application API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
