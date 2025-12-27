import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/utils/logger"
import type { Database } from "@/lib/database.types"
import { validateEmail, validateText, validateUrl, validatePhone, validateNumber } from "@/lib/utils/validation"
import { createSecureResponse, handlePreflight } from "@/lib/utils/security"

type ApplicationRow = Database["public"]["Tables"]["applications"]["Row"]
type ApplicationInsert = Database["public"]["Tables"]["applications"]["Insert"]

export async function POST(request: NextRequest) {
  try {
    // Handle preflight OPTIONS request
    const preflightResponse = handlePreflight(request)
    if (preflightResponse) return preflightResponse

    const supabase = await createClient()

    // Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return createSecureResponse({ error: "Authentication required" }, 401)
    }

    const body = await request.json()
    const { fullName, email, position, coverLetter, resumeUrl, phoneNumber, linkedinUrl, portfolioUrl, experience } =
      body

    // Validate required fields with proper validation
    const fullNameValidation = validateText(fullName, { minLength: 1, maxLength: 255, required: true })
    if (!fullNameValidation.isValid) {
      return createSecureResponse({ error: `Full name: ${fullNameValidation.error}` }, 400)
    }

    const emailValidation = validateEmail(email)
    if (!emailValidation.isValid) {
      return createSecureResponse({ error: `Email: ${emailValidation.error}` }, 400)
    }

    const positionValidation = validateText(position, { minLength: 1, maxLength: 255, required: true })
    if (!positionValidation.isValid) {
      return createSecureResponse({ error: `Position: ${positionValidation.error}` }, 400)
    }

    const resumeUrlValidation = validateUrl(resumeUrl, true)
    if (!resumeUrlValidation.isValid) {
      return createSecureResponse({ error: `Resume URL: ${resumeUrlValidation.error}` }, 400)
    }

    // Validate optional fields
    if (coverLetter) {
      const coverLetterValidation = validateText(coverLetter, { maxLength: 10000 })
      if (!coverLetterValidation.isValid) {
        return createSecureResponse({ error: `Cover letter: ${coverLetterValidation.error}` }, 400)
      }
    }

    if (phoneNumber) {
      const phoneValidation = validatePhone(phoneNumber)
      if (!phoneValidation.isValid) {
        return createSecureResponse({ error: `Phone: ${phoneValidation.error}` }, 400)
      }
    }

    if (linkedinUrl) {
      const linkedinValidation = validateUrl(linkedinUrl)
      if (!linkedinValidation.isValid) {
        return createSecureResponse({ error: `LinkedIn URL: ${linkedinValidation.error}` }, 400)
      }
    }

    if (portfolioUrl) {
      const portfolioValidation = validateUrl(portfolioUrl)
      if (!portfolioValidation.isValid) {
        return createSecureResponse({ error: `Portfolio URL: ${portfolioValidation.error}` }, 400)
      }
    }

    if (experience !== undefined && experience !== null) {
      const experienceValidation = validateNumber(experience, { min: 0, max: 50, integer: true })
      if (!experienceValidation.isValid) {
        return createSecureResponse({ error: `Experience: ${experienceValidation.error}` }, 400)
      }
    }

    // Prepare insert data with proper types and sanitized values
    const insertData: ApplicationInsert = {
      full_name: fullNameValidation.sanitized!,
      email: emailValidation.sanitized!,
      position_applied: positionValidation.sanitized!,
      cover_letter: coverLetter ? validateText(coverLetter, { maxLength: 10000 }).sanitized || null : null,
      resume_url: resumeUrlValidation.sanitized!,
      phone_number: phoneNumber ? validatePhone(phoneNumber).sanitized || null : null,
      linkedin_url: linkedinUrl ? validateUrl(linkedinUrl).sanitized || null : null,
      portfolio_url: portfolioUrl ? validateUrl(portfolioUrl).sanitized || null : null,
      years_experience: experience !== undefined && experience !== null 
        ? (validateNumber(experience, { min: 0, max: 50, integer: true }).sanitized as number | undefined) || null
        : null,
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
      return createSecureResponse({ error: "Failed to save application" }, 500)
    }

    // Type assertion for application data
    const applicationData = (application as ApplicationRow | null)
    
    if (!applicationData) {
      logger.error("Application was not returned after insert", {
        context: "Careers",
        data: { userId: user.id, email: emailValidation.sanitized },
      })
      return createSecureResponse({ error: "Failed to save application" }, 500)
    }

    logger.info("Application submitted successfully", {
      context: "Careers",
      data: {
        applicationId: applicationData.id,
        position: positionValidation.sanitized,
        email: emailValidation.sanitized,
        userId: user.id,
      },
    })

    return createSecureResponse({
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
    return createSecureResponse({ error: "Internal server error" }, 500)
  }
}
