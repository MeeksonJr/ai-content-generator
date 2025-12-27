import { NextResponse } from "next/server"
import { logger } from "@/lib/utils/logger"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { AuthenticationError, handleApiError, NotFoundError } from "@/lib/utils/error-handler"
import type { Database } from "@/lib/database.types"

type UserProfileUpdate = Database["public"]["Tables"]["user_profiles"]["Update"]

export async function GET() {
  try {
    const supabase = await createSupabaseRouteClient()

    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile
    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", session.user.id)
      .single()

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "no rows returned" which is fine - profile doesn't exist yet
      const { statusCode, error: apiError } = handleApiError(error, "Profile GET")
      return NextResponse.json(apiError, { status: statusCode })
    }

    // If profile doesn't exist, create one
    if (!profile) {
      const { data: newProfile, error: insertError } = await supabase
        .from("user_profiles")
        .insert({
          id: session.user.id,
          is_admin: false,
        } as any)
        .select()
        .single()

      if (insertError) {
        logger.error("Error creating user profile", { context: "Profile", userId: session.user.id }, insertError)
        return NextResponse.json({ error: "Failed to create profile" }, { status: 500 })
      }

      return NextResponse.json({ profile: newProfile })
    }

    return NextResponse.json({ profile })
  } catch (error) {
    const { statusCode, error: apiError } = handleApiError(error, "Profile GET")
    return NextResponse.json(apiError, { status: statusCode })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createSupabaseRouteClient()

    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get request body
    const body = await request.json()
    const {
      bio,
      avatar_url,
      twitter_url,
      linkedin_url,
      github_url,
      website_url,
      location,
      display_name,
    } = body

    // Build update object
    const updateData: UserProfileUpdate = {
      updated_at: new Date().toISOString(),
    }

    if (bio !== undefined) updateData.bio = bio
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url
    if (twitter_url !== undefined) updateData.twitter_url = twitter_url
    if (linkedin_url !== undefined) updateData.linkedin_url = linkedin_url
    if (github_url !== undefined) updateData.github_url = github_url
    if (website_url !== undefined) updateData.website_url = website_url
    if (location !== undefined) updateData.location = location
    if (display_name !== undefined) updateData.display_name = display_name

    // Ensure profile exists first
    const { data: existingProfile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("id", session.user.id)
      .single()

    if (!existingProfile) {
      // Create profile if it doesn't exist
      const { error: insertError } = await supabase.from("user_profiles").insert({
        id: session.user.id,
        is_admin: false,
        ...updateData,
      } as any)

      if (insertError) {
        logger.error("Error creating user profile", { context: "Profile", userId: session.user.id }, insertError)
        return NextResponse.json({ error: "Failed to create profile" }, { status: 500 })
      }
    } else {
      // Update existing profile
      const { data: updatedProfile, error: updateError } = await supabase
        .from("user_profiles")
        // @ts-ignore - Type will be correct after database migration
        .update(updateData as any)
        .eq("id", session.user.id)
        .select()
        .single()

      if (updateError) {
        const { statusCode, error: apiError } = handleApiError(updateError, "Profile PATCH")
        return NextResponse.json(apiError, { status: statusCode })
      }

      logger.info("User profile updated", {
        context: "Profile",
        userId: session.user.id,
        data: { fields: Object.keys(updateData) },
      })

      return NextResponse.json({ profile: updatedProfile })
    }

    // Fetch the newly created profile
    const { data: newProfile } = await supabase
      .from("user_profiles")
      .select()
      .eq("id", session.user.id)
      .single()

    return NextResponse.json({ profile: newProfile })
  } catch (error) {
    const { statusCode, error: apiError } = handleApiError(error, "Profile PATCH")
    return NextResponse.json(apiError, { status: statusCode })
  }
}

