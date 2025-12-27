import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import type { Database } from "@/lib/database.types"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { logger } from "@/lib/utils/logger"
import { handleApiError, AuthenticationError, AuthorizationError, ValidationError, NotFoundError } from "@/lib/utils/error-handler"
import { validateUuid } from "@/lib/utils/validation"
import { createSecureResponse, handlePreflight } from "@/lib/utils/security"
import { STATUS } from "@/lib/constants/app.constants"

type UserProfileRow = Database["public"]["Tables"]["user_profiles"]["Row"]
type SubscriptionRow = Database["public"]["Tables"]["subscriptions"]["Row"]
type UsageStatsRow = Database["public"]["Tables"]["usage_stats"]["Row"]

interface AdminUserUpdatePayload {
  isAdmin?: boolean
  subscriptionStatus?: string
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Handle preflight OPTIONS request
    const preflightResponse = handlePreflight(request)
    if (preflightResponse) return preflightResponse

    const { id } = await params

    // Validate UUID
    const uuidValidation = validateUuid(id)
    if (!uuidValidation.isValid) {
      const { statusCode, error } = handleApiError(
        new ValidationError(uuidValidation.error || "Invalid user ID format"),
        "Admin Users PATCH"
      )
      return createSecureResponse(error, statusCode)
    }

    const supabase = await createSupabaseRouteClient()

    const sessionResult = await supabase.auth.getSession()
    const session = sessionResult.data.session

    if (!session) {
      const { statusCode, error } = handleApiError(new AuthenticationError(), "Admin Users PATCH")
      return createSecureResponse(error, statusCode)
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
      const { statusCode, error } = handleApiError(actingProfileResponse.error, "Admin Users PATCH")
      return createSecureResponse(error, statusCode)
    }

    const actingProfile = actingProfileResponse.data as Pick<UserProfileRow, "is_admin"> | null

    if (!actingProfile?.is_admin) {
      const { statusCode, error } = handleApiError(
        new AuthorizationError("Admin access required"),
        "Admin Users PATCH"
      )
      return createSecureResponse(error, statusCode)
    }

    const body = (await request.json().catch(() => ({}))) as AdminUserUpdatePayload

    if (!body || (typeof body.isAdmin === "undefined" && !body.subscriptionStatus)) {
      const { statusCode, error } = handleApiError(
        new ValidationError("No changes provided"),
        "Admin Users PATCH"
      )
      return createSecureResponse(error, statusCode)
    }

    const targetUserId = id

    // Validate subscription status if provided
    if (body.subscriptionStatus) {
      const validStatuses = ["active", "inactive", "cancelled", "expired", "suspended"]
      if (!validStatuses.includes(body.subscriptionStatus)) {
        const { statusCode, error } = handleApiError(
          new ValidationError(`Invalid subscription status. Must be one of: ${validStatuses.join(", ")}`),
          "Admin Users PATCH"
        )
        return createSecureResponse(error, statusCode)
      }
    }

    if (typeof body.isAdmin === "boolean") {
      const { error: updateProfileError } = await (supabase as any)
        .from("user_profiles")
        .update({ is_admin: body.isAdmin, updated_at: new Date().toISOString() } as any)
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
        const { statusCode, error } = handleApiError(
          new NotFoundError("Subscription not found"),
          "Admin Users PATCH"
        )
        return createSecureResponse(error, statusCode)
      }

      const { error: updateSubscriptionError } = await (supabase as any)
        .from("subscriptions")
        .update({
          status: body.subscriptionStatus,
          updated_at: new Date().toISOString(),
        } as any)
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

    return createSecureResponse({
      profile: profileResponse.data as UserProfileRow | null,
      subscription: subscriptionResponse.data as SubscriptionRow | null,
      usage: usageResponse.data as UsageStatsRow[] | null,
    })
  } catch (error) {
    logger.error("Unhandled error in admin user update API", { context: "AdminUsers" }, error as Error)
    const { statusCode, error: apiError } = handleApiError(error, "Admin Users")
    return createSecureResponse(apiError, statusCode)
  }
}

