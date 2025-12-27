import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/utils/logger"
import type { Database } from "@/lib/database.types"

type ApplicationRow = Database["public"]["Tables"]["applications"]["Row"]
type ApplicationInsert = Database["public"]["Tables"]["applications"]["Insert"]

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

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

    // Prepare insert data with proper types
    const insertData: ApplicationInsert = {
      full_name: fullName,
      email: email,
      position_applied: position,
      cover_letter: coverLetter || null,
      resume_url: resumeUrl,
      phone_number: phoneNumber || null,
      linkedin_url: linkedinUrl || null,
      portfolio_url: portfolioUrl || null,
      years_experience: experience || null,
      user_id: user.id,
      status: "pending",
      submitted_at: new Date().toISOString(),
    }

    // Insert application into database
    const { data: application, error } = await supabase
      .from("applications")
      // @ts-ignore - Known Supabase type inference issue with insert operations
      .insert(insertData)
      .select()
      .single()

    if (error) {
      logger.error("Error saving application", {
        context: "Careers",
        data: {
          error: error.message,
          code: error.code,
          details: error.details,
        },
      })
      return NextResponse.json({ error: "Failed to save application" }, { status: 500 })
    }

    // Type assertion for application data
    const applicationData = (application as ApplicationRow | null)
    
    if (!applicationData) {
      logger.error("Application was not returned after insert", {
        context: "Careers",
        data: { userId: user.id, email },
      })
      return NextResponse.json({ error: "Failed to save application" }, { status: 500 })
    }

    logger.info("Application submitted successfully", {
      context: "Careers",
      data: {
        applicationId: applicationData.id,
        position: position,
        email: email,
        userId: user.id,
      },
    })

    return NextResponse.json({
      message: "Application submitted successfully",
      applicationId: applicationData.id,
    })
  } catch (error) {
    logger.error(
      "Error in careers application API",
      {
        context: "Careers",
      },
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
