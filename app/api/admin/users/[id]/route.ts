import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { logger } from "@/lib/utils/logger"

interface AdminUserUpdatePayload {
  isAdmin?: boolean
  subscriptionStatus?: string
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const actingUserId = session.user.id

    const { data: actingProfile, error: actingProfileError } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("id", actingUserId)
      .maybeSingle()

    if (actingProfileError) {
      logger.error("Failed to fetch acting user profile", { context: "AdminUsers", data: { actingUserId } }, actingProfileError as Error)
      return NextResponse.json({ error: "Failed to verify permissions" }, { status: 500 })
    }

    if (!actingProfile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = (await request.json().catch(() => ({}))) as AdminUserUpdatePayload

    if (!body || (typeof body.isAdmin === "undefined" && !body.subscriptionStatus)) {
      return NextResponse.json({ error: "No changes provided" }, { status: 400 })
    }

    const targetUserId = params.id

    if (!targetUserId) {
      return NextResponse.json({ error: "Missing user id" }, { status: 400 })
    }

    if (typeof body.isAdmin === "boolean") {
      const { error: updateProfileError } = await supabase
        .from("user_profiles")
        .update({ is_admin: body.isAdmin, updated_at: new Date().toISOString() })
        .eq("id", targetUserId)

      if (updateProfileError) {
        logger.error(
          "Failed to update admin flag",
          { context: "AdminUsers", data: { targetUserId } },
          updateProfileError as Error,
        )
        return NextResponse.json({ error: "Failed to update admin status" }, { status: 500 })
      }
    }

    if (body.subscriptionStatus) {
      const { data: subscription, error: subscriptionError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (subscriptionError) {
        logger.error(
          "Failed to fetch subscription for admin update",
          { context: "AdminUsers", data: { targetUserId } },
          subscriptionError as Error,
        )
        return NextResponse.json({ error: "Failed to fetch subscription" }, { status: 500 })
      }

      if (!subscription) {
        return NextResponse.json({ error: "Subscription not found" }, { status: 404 })
      }

      const { error: updateSubscriptionError } = await supabase
        .from("subscriptions")
        .update({
          status: body.subscriptionStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscription.id)

      if (updateSubscriptionError) {
        logger.error(
          "Failed to update subscription status",
          { context: "AdminUsers", data: { targetUserId, subscriptionId: subscription.id } },
          updateSubscriptionError as Error,
        )
        return NextResponse.json({ error: "Failed to update subscription status" }, { status: 500 })
      }
    }

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", targetUserId)
      .maybeSingle()

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    const { data: usage } = await supabase
      .from("usage_stats")
      .select("*")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false })

    if (profileError) {
      logger.error(
        "Failed to refetch profile after admin update",
        { context: "AdminUsers", data: { targetUserId } },
        profileError as Error,
      )
    }

    return NextResponse.json({
      profile,
      subscription,
      usage,
    })
  } catch (error) {
    logger.error("Unhandled error in admin user update API", { context: "AdminUsers" }, error as Error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

