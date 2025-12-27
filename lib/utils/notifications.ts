import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { sendEmail } from "@/lib/email/email-service"
import { logger } from "@/lib/utils/logger"

interface CreateNotificationOptions {
  userId: string
  type: "info" | "success" | "warning" | "error" | "payment" | "subscription" | "content" | "system"
  title: string
  message: string
  actionUrl?: string
  metadata?: any
  expiresAt?: Date
  sendEmail?: boolean
}

/**
 * Create a notification for a user
 * This function can be used from API routes or server actions
 */
export async function createNotification(options: CreateNotificationOptions): Promise<string | null> {
  try {
    const supabase = createServerSupabaseClient()

    // Check user's notification preferences
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("notification_preferences")
      .eq("id", options.userId)
      .maybeSingle()

    const preferences = profile?.notification_preferences || {
      email: true,
      in_app: true,
      payment: true,
      subscription: true,
      content: true,
      system: true,
    }

    // Check if user wants this type of notification
    const notificationTypeEnabled = preferences[options.type] !== false
    const inAppEnabled = preferences.in_app !== false

    if (!notificationTypeEnabled || !inAppEnabled) {
      logger.info("Notification skipped due to user preferences", {
        context: "Notifications",
        userId: options.userId,
        data: { type: options.type, preferences },
      })
      return null
    }

    // Create in-app notification
    const { data: notification, error } = await (supabase as any)
      .from("notifications")
      .insert({
        user_id: options.userId,
        type: options.type,
        title: options.title,
        message: options.message,
        action_url: options.actionUrl || null,
        metadata: options.metadata || null,
        expires_at: options.expiresAt?.toISOString() || null,
      } as any)
      .select()
      .single()

    if (error) {
      logger.error("Error creating notification", {
        context: "Notifications",
        userId: options.userId,
      }, error)
      return null
    }

    // Send email notification if enabled
    const emailEnabled = preferences.email !== false && (options.sendEmail !== false)
    if (emailEnabled && notification) {
      try {
        const emailSent = await sendEmail({
          to: "", // Will need to fetch user email
          subject: options.title,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">${options.title}</h2>
              <p style="color: #666; line-height: 1.6;">${options.message}</p>
              ${options.actionUrl ? `<a href="${process.env.NEXT_PUBLIC_APP_URL}${options.actionUrl}" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">View Details</a>` : ""}
            </div>
          `,
        })

        if (emailSent) {
          await (supabase as any)
            .from("notifications")
            .update({ email_sent: true } as any)
            .eq("id", notification.id)
        }
      } catch (emailError) {
        logger.error("Error sending email notification", {
          context: "Notifications",
          userId: options.userId,
        }, emailError as Error)
      }
    }

    logger.info("Notification created", {
      context: "Notifications",
      userId: options.userId,
      data: {
        notificationId: notification.id,
        type: options.type,
      },
    })

    return notification.id
  } catch (error) {
    logger.error("Error in createNotification", {
      context: "Notifications",
      userId: options.userId,
    }, error as Error)
    return null
  }
}

/**
 * Create multiple notifications (bulk)
 */
export async function createNotifications(
  notifications: CreateNotificationOptions[]
): Promise<string[]> {
  const results = await Promise.all(
    notifications.map((notification) => createNotification(notification))
  )
  return results.filter((id): id is string => id !== null)
}

