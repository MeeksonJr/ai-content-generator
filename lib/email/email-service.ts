import nodemailer from "nodemailer"
import { logger } from "@/lib/utils/logger"

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USERNAME,
      pass: process.env.SMTP_PASSWORD,
    },
  })
}

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export const sendEmail = async ({ to, subject, html, text }: SendEmailOptions): Promise<boolean> => {
  try {
    // Validate SMTP configuration
    if (!process.env.SMTP_HOST || !process.env.SMTP_USERNAME || !process.env.SMTP_PASSWORD) {
      logger.error("SMTP configuration is missing", {
        context: "Email",
        data: {
          hasHost: !!process.env.SMTP_HOST,
          hasUsername: !!process.env.SMTP_USERNAME,
          hasPassword: !!process.env.SMTP_PASSWORD,
        },
      })
      return false
    }

    const transporter = createTransporter()

    // Verify connection
    await transporter.verify()

    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || "AI Content Generator"}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USERNAME}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ""), // Strip HTML for text version
    }

    const info = await transporter.sendMail(mailOptions)

    logger.info("Email sent successfully", {
      context: "Email",
      data: {
        to,
        subject,
        messageId: info.messageId,
      },
    })

    return true
  } catch (error) {
    logger.error("Failed to send email", {
      context: "Email",
      data: {
        to,
        subject,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    })
    return false
  }
}

// Newsletter welcome email template
export const sendNewsletterWelcomeEmail = async (email: string): Promise<boolean> => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Our Newsletter</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Our Newsletter! 🎉</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; margin-bottom: 20px;">Thank you for subscribing to our newsletter!</p>
          <p style="font-size: 16px; margin-bottom: 20px;">
            We're excited to have you on board. You'll now receive:
          </p>
          <ul style="font-size: 16px; margin-bottom: 20px; padding-left: 20px;">
            <li>Latest updates on AI content generation features</li>
            <li>Tips and best practices for content creation</li>
            <li>Exclusive offers and early access to new features</li>
            <li>Industry insights and case studies</li>
          </ul>
          <p style="font-size: 16px; margin-bottom: 20px;">
            If you have any questions or feedback, feel free to reply to this email. We'd love to hear from you!
          </p>
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}" 
               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
              Visit Our Platform
            </a>
          </div>
          <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            Best regards,<br>
            The AI Content Generator Team
          </p>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #9ca3af;">
          <p>You're receiving this email because you subscribed to our newsletter.</p>
          <p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/unsubscribe?email=${encodeURIComponent(email)}" 
               style="color: #667eea; text-decoration: none;">
              Unsubscribe
            </a>
          </p>
        </div>
      </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: "Welcome to Our Newsletter! 🎉",
    html,
  })
}

