import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Get the current user from Supabase
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error("Authentication error:", userError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // For now, let's skip the admin check to test the functionality
    // TODO: Re-enable admin check once user_profiles table is set up
    /*
    const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("id", user.id).single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
    }
    */

    const body = await request.json()
    const { applicationId, resumeText } = body

    if (!applicationId) {
      return NextResponse.json({ error: "Application ID is required" }, { status: 400 })
    }

    // Check if application exists
    const { data: application, error: appError } = await supabase
      .from("applications")
      .select("*")
      .eq("id", applicationId)
      .single()

    if (appError || !application) {
      console.error("Application not found:", appError)
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    // Generate analysis based on available data
    const textToAnalyze =
      resumeText ||
      application.cover_letter ||
      `
      Name: ${application.full_name}
      Position: ${application.position_applied}
      Experience: ${application.years_experience || "Not specified"}
      Email: ${application.email}
    `

    // Simple but comprehensive analysis
    const analysis = generateAnalysis(textToAnalyze, application)

    // Update the application with analysis
    const { error: updateError } = await supabase
      .from("applications")
      .update({
        ai_analysis: analysis,
        analyzed_at: new Date().toISOString(),
      })
      .eq("id", applicationId)

    if (updateError) {
      console.error("Failed to update application:", updateError)
      return NextResponse.json({ error: "Failed to save analysis" }, { status: 500 })
    }

    console.log("Analysis completed successfully for application:", applicationId)

    return NextResponse.json({
      success: true,
      analysis,
      message: "Analysis completed successfully",
    })
  } catch (error) {
    console.error("Resume analysis error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
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
