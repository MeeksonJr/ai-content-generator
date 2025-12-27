import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { logger } from "@/lib/utils/logger"
import { handleApiError, AuthenticationError, AuthorizationError, ValidationError, NotFoundError } from "@/lib/utils/error-handler"
import { validateUuid, validateText } from "@/lib/utils/validation"
import { createSecureResponse, handlePreflight } from "@/lib/utils/security"
import { API_CONFIG } from "@/lib/constants/app.constants"

export async function POST(request: NextRequest) {
  try {
    // Handle preflight OPTIONS request
    const preflightResponse = handlePreflight(request)
    if (preflightResponse) return preflightResponse

    const supabase = await createSupabaseRouteClient()

    // Get the current user from Supabase
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      const { statusCode, error } = handleApiError(new AuthenticationError(), "Analyze Resume POST")
      return createSecureResponse(error, statusCode)
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("id", session.user.id)
      .maybeSingle()

    const isAdmin = (profile as { is_admin?: boolean } | null)?.is_admin || false

    if (!isAdmin) {
      const { statusCode, error } = handleApiError(
        new AuthorizationError("Admin access required"),
        "Analyze Resume POST"
      )
      return createSecureResponse(error, statusCode)
    }

    const body = await request.json()
    const { applicationId, resumeText } = body

    // Validate application ID
    if (!applicationId) {
      const { statusCode, error } = handleApiError(
        new ValidationError("Application ID is required"),
        "Analyze Resume POST"
      )
      return createSecureResponse(error, statusCode)
    }

    const uuidValidation = validateUuid(applicationId)
    if (!uuidValidation.isValid) {
      const { statusCode, error } = handleApiError(
        new ValidationError(uuidValidation.error || "Invalid application ID format"),
        "Analyze Resume POST"
      )
      return createSecureResponse(error, statusCode)
    }

    // Validate resume text if provided
    if (resumeText) {
      const textValidation = validateText(resumeText, {
        minLength: 1,
        maxLength: API_CONFIG.MAX_CONTENT_LENGTH,
      })
      if (!textValidation.isValid) {
        const { statusCode, error } = handleApiError(
          new ValidationError(`Resume text: ${textValidation.error}`),
          "Analyze Resume POST"
        )
        return createSecureResponse(error, statusCode)
      }
    }

    // Check if application exists
    const serverSupabase = createServerSupabaseClient()
    const { data: application, error: appError } = await (serverSupabase as any)
      .from("applications")
      .select("*")
      .eq("id", applicationId)
      .maybeSingle()

    if (appError || !application) {
      const { statusCode, error } = handleApiError(
        appError || new NotFoundError("Application not found"),
        "Analyze Resume POST"
      )
      return createSecureResponse(error, statusCode)
    }

    // Type assertion for application data
    const appData = application as {
      cover_letter?: string
      full_name?: string
      position_applied?: string
      years_experience?: string
      email?: string
      [key: string]: any
    }

    // Generate analysis based on available data
    const textToAnalyze =
      resumeText ||
      appData.cover_letter ||
      `
      Name: ${appData.full_name || "N/A"}
      Position: ${appData.position_applied || "N/A"}
      Experience: ${appData.years_experience || "Not specified"}
      Email: ${appData.email || "N/A"}
    `

    // Simple but comprehensive analysis
    const analysis = generateAnalysis(textToAnalyze, appData)

    // Update the application with analysis
    const { error: updateError } = await supabase
      .from("applications")
      // @ts-ignore - Known Supabase type inference issue with update operations
      .update({
        ai_analysis: analysis,
        analyzed_at: new Date().toISOString(),
      })
      .eq("id", applicationId)

    if (updateError) {
      const { statusCode, error: apiError } = handleApiError(updateError, "Analyze Resume POST")
      return createSecureResponse(apiError, statusCode)
    }

    logger.info("Analysis completed successfully", {
      context: "Admin",
      userId: session.user.id,
      data: { applicationId },
    })

    return createSecureResponse({
      success: true,
      analysis,
      message: "Analysis completed successfully",
    })
  } catch (error) {
    logger.error("Resume analysis error", {
      context: "Admin",
    }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Analyze Resume")
    return createSecureResponse(apiError, statusCode)
  }
}

function generateAnalysis(text: string, application: any) {
  const keywords = extractKeywords(text)
  const experienceLevel = determineExperienceLevel(application.years_experience)
  const score = calculateScore(text, application)

  return {
    score,
    strengths: generateStrengths(text, application, keywords),
    weaknesses: generateWeaknesses(text, application),
    recommendation: generateRecommendation(score),
    keywords,
    experienceLevel,
    analysisDate: new Date().toISOString(),
  }
}

function extractKeywords(text: string): string[] {
  const commonWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "can",
    "may",
    "might",
    "must",
    "shall",
    "this",
    "that",
    "these",
    "those",
    "i",
    "you",
    "he",
    "she",
    "it",
    "we",
    "they",
    "me",
    "him",
    "her",
    "us",
    "them",
    "my",
    "your",
    "his",
    "her",
    "its",
    "our",
    "their",
  ])

  const techKeywords = [
    "javascript",
    "python",
    "react",
    "node",
    "sql",
    "aws",
    "docker",
    "kubernetes",
    "typescript",
    "java",
    "c++",
    "html",
    "css",
    "git",
    "api",
    "database",
    "frontend",
    "backend",
    "fullstack",
    "agile",
    "scrum",
    "devops",
    "ci/cd",
    "testing",
    "mongodb",
    "postgresql",
    "mysql",
    "redis",
    "graphql",
    "rest",
    "microservices",
    "cloud",
  ]

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !commonWords.has(word))

  // Prioritize tech keywords
  const foundTechKeywords = words.filter((word) =>
    techKeywords.some((tech) => word.includes(tech) || tech.includes(word)),
  )

  const otherKeywords = words.filter((word) => !foundTechKeywords.includes(word)).slice(0, 5)

  return [...foundTechKeywords, ...otherKeywords].slice(0, 10)
}

function determineExperienceLevel(experience: string | null): string {
  if (!experience) return "Not specified"

  const exp = experience.toLowerCase()
  if (exp.includes("0") || exp.includes("entry") || exp.includes("junior")) {
    return "Entry Level"
  } else if (exp.includes("1") || exp.includes("2") || exp.includes("3")) {
    return "Junior"
  } else if (exp.includes("4") || exp.includes("5") || exp.includes("6") || exp.includes("mid")) {
    return "Mid Level"
  } else if (exp.includes("senior") || exp.includes("7") || exp.includes("8") || exp.includes("9")) {
    return "Senior"
  } else if (exp.includes("lead") || exp.includes("10") || exp.includes("manager")) {
    return "Lead/Manager"
  }

  return "Experienced"
}

function calculateScore(text: string, application: any): number {
  let score = 50 // Base score

  // Check for completeness
  if (application.cover_letter && application.cover_letter.length > 100) score += 10
  if (application.linkedin_url) score += 5
  if (application.portfolio_url) score += 5
  if (application.years_experience) score += 10

  // Check for keywords in text
  const keywords = extractKeywords(text)
  score += Math.min(keywords.length * 2, 20)

  // Random factor for variability
  score += Math.floor(Math.random() * 10) - 5

  return Math.min(Math.max(score, 30), 95) // Ensure score is between 30-95
}

function generateStrengths(text: string, application: any, keywords: string[]): string[] {
  const strengths = []

  if (application.cover_letter && application.cover_letter.length > 200) {
    strengths.push("Detailed and thoughtful cover letter")
  }

  if (application.linkedin_url) {
    strengths.push("Professional online presence")
  }

  if (application.portfolio_url) {
    strengths.push("Portfolio demonstrates practical skills")
  }

  if (keywords.length > 5) {
    strengths.push("Strong technical vocabulary and relevant experience")
  }

  if (application.years_experience && !application.years_experience.includes("0")) {
    strengths.push("Relevant work experience")
  }

  // Add some default strengths if none found
  if (strengths.length === 0) {
    strengths.push("Complete application submission", "Professional communication")
  }

  return strengths.slice(0, 4)
}

function generateWeaknesses(text: string, application: any): string[] {
  const weaknesses = []

  if (!application.cover_letter || application.cover_letter.length < 100) {
    weaknesses.push("Cover letter could be more detailed")
  }

  if (!application.linkedin_url) {
    weaknesses.push("No LinkedIn profile provided")
  }

  if (!application.portfolio_url) {
    weaknesses.push("No portfolio or work samples provided")
  }

  if (!application.years_experience || application.years_experience.includes("0")) {
    weaknesses.push("Limited professional experience")
  }

  // Ensure at least one weakness for balanced feedback
  if (weaknesses.length === 0) {
    weaknesses.push("Could benefit from additional technical certifications")
  }

  return weaknesses.slice(0, 3)
}

function generateRecommendation(score: number): string {
  if (score >= 80) {
    return "Strong candidate - Recommend for immediate interview"
  } else if (score >= 65) {
    return "Good candidate - Consider for interview"
  } else if (score >= 50) {
    return "Potential candidate - Review with team"
  } else {
    return "May not be the best fit for this position"
  }
}
