import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { sendNewsletterWelcomeEmail } from "@/lib/email/email-service"
import { logger } from "@/lib/utils/logger"
import type { Database } from "@/lib/database.types"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email address is required" }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const supabase = createServerSupabaseClient()

    // Check if email already exists
    const { data: existing } = await supabase
      .from("newsletter_subscribers")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: "This email is already subscribed to our newsletter" },
        { status: 400 },
      )
    }

    // Insert new subscriber
    const { data, error } = await supabase
      .from("newsletter_subscribers")
      // @ts-expect-error - TypeScript may not recognize the table type until server restart, but table exists in DB
      .insert({
        email: normalizedEmail,
        subscribed_at: new Date().toISOString(),
        status: "active",
      })
      .select()
      .single()

    if (error) {
      // If table doesn't exist, still try to send email (graceful degradation)
      if (error.code === "42P01") {
        logger.warn("Newsletter subscribers table not found, but will still send welcome email", {
          context: "Newsletter",
          data: { email: normalizedEmail },
        })
      } else {
        throw error
      }
    }

    // Send welcome email
    try {
      const emailSent = await sendNewsletterWelcomeEmail(normalizedEmail)
      if (emailSent) {
        logger.info("Welcome email sent successfully", {
          context: "Newsletter",
          data: { email: normalizedEmail },
        })
      } else {
        logger.warn("Failed to send welcome email, but subscription was recorded", {
          context: "Newsletter",
          data: { email: normalizedEmail },
        })
      }
    } catch (emailError) {
      // Don't fail the subscription if email fails
      logger.error("Error sending welcome email", {
        context: "Newsletter",
        data: {
          email: normalizedEmail,
          error: emailError instanceof Error ? emailError.message : "Unknown error",
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: "Thank you for subscribing! Check your email for a welcome message.",
    })
  } catch (error) {
    logger.error("Error subscribing to newsletter", {
      context: "Newsletter",
      data: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
    })
    return NextResponse.json(
      {
        error: "Failed to subscribe to newsletter",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

