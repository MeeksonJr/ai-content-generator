import { NextResponse } from "next/server"
import type { Database } from "@/lib/database.types"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { logger } from "@/lib/utils/logger"

type UserProfileRow = Database["public"]["Tables"]["user_profiles"]["Row"]
type SubscriptionRow = Database["public"]["Tables"]["subscriptions"]["Row"]
type UsageStatsRow = Database["public"]["Tables"]["usage_stats"]["Row"]

interface AdminUserUpdatePayload {
  isAdmin?: boolean
  subscriptionStatus?: string
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createSupabaseRouteClient()

    const sessionResult = await supabase.auth.getSession()
    const session = sessionResult.data.session

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const actingUserId = session.user.id

    const actingProfileResponse = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("id", actingUserId)
      .maybeSingle()

    if (actingProfileResponse.error) {
      logger.error(
        "Failed to fetch acting user profile",
        { context: "AdminUsers", data: { actingUserId } },
        actingProfileResponse.error as Error,
      )
      return NextResponse.json({ error: "Failed to verify permissions" }, { status: 500 })
    }

    const actingProfile = actingProfileResponse.data as Pick<UserProfileRow, "is_admin"> | null

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
      const subscriptionResponse = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (subscriptionResponse.error) {
        logger.error(
          "Failed to fetch subscription for admin update",
          { context: "AdminUsers", data: { targetUserId } },
          subscriptionResponse.error as Error,
        )
        return NextResponse.json({ error: "Failed to fetch subscription" }, { status: 500 })
      }

      const subscription = subscriptionResponse.data as SubscriptionRow | null

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

    const profileResponse = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", targetUserId)
      .maybeSingle()

    const subscriptionResponse = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    const usageResponse = await supabase
      .from("usage_stats")
      .select("*")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false })

    if (profileResponse.error) {
      logger.error(
        "Failed to refetch profile after admin update",
        { context: "AdminUsers", data: { targetUserId } },
        profileResponse.error as Error,
      )
    }

    return NextResponse.json({
      profile: profileResponse.data as UserProfileRow | null,
      subscription: subscriptionResponse.data as SubscriptionRow | null,
      usage: usageResponse.data as UsageStatsRow[] | null,
    })
  } catch (error) {
    logger.error("Unhandled error in admin user update API", { context: "AdminUsers" }, error as Error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

