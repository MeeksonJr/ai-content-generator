import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { logger } from "@/lib/utils/logger"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { AuthenticationError, handleApiError, NotFoundError, ValidationError } from "@/lib/utils/error-handler"
import type { Database } from "@/lib/database.types"
import { validateText, validateUrl } from "@/lib/utils/validation"
import { createSecureResponse, handlePreflight } from "@/lib/utils/security"
import { API_CONFIG } from "@/lib/constants/app.constants"

type UserProfileUpdate = Database["public"]["Tables"]["user_profiles"]["Update"]

export async function GET(request: NextRequest) {
  try {
    // Handle preflight OPTIONS request
    const preflightResponse = handlePreflight(request)
    if (preflightResponse) return preflightResponse

    const supabase = await createSupabaseRouteClient()

    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      const { statusCode, error } = handleApiError(new AuthenticationError(), "Profile GET")
      return createSecureResponse(error, statusCode)
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
        return createSecureResponse({ error: "Failed to create profile" }, 500)
      }

      return createSecureResponse({ profile: newProfile })
    }

    return createSecureResponse({ profile })
  } catch (error) {
    const { statusCode, error: apiError } = handleApiError(error, "Profile GET")
    return createSecureResponse(apiError, statusCode)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Handle preflight OPTIONS request
    const preflightResponse = handlePreflight(request)
    if (preflightResponse) return preflightResponse

    const supabase = await createSupabaseRouteClient()

    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      const { statusCode, error } = handleApiError(new AuthenticationError(), "Profile PATCH")
      return createSecureResponse(error, statusCode)
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
      notification_preferences,
    } = body

    // Build update object with validation
    const updateData: UserProfileUpdate = {
      updated_at: new Date().toISOString(),
    }

    // Validate and sanitize bio
    if (bio !== undefined) {
      const bioValidation = validateText(bio, { maxLength: 1000 })
      if (!bioValidation.isValid) {
        const { statusCode, error } = handleApiError(
          new ValidationError(`Bio: ${bioValidation.error}`),
          "Profile PATCH"
        )
        return createSecureResponse(error, statusCode)
      }
      updateData.bio = bioValidation.sanitized
    }

    // Validate URLs
    if (avatar_url !== undefined && avatar_url) {
      const urlValidation = validateUrl(avatar_url)
      if (!urlValidation.isValid) {
        const { statusCode, error } = handleApiError(
          new ValidationError(`Avatar URL: ${urlValidation.error}`),
          "Profile PATCH"
        )
        return createSecureResponse(error, statusCode)
      }
      updateData.avatar_url = urlValidation.sanitized
    }

    if (twitter_url !== undefined && twitter_url) {
      const urlValidation = validateUrl(twitter_url)
      if (!urlValidation.isValid) {
        const { statusCode, error } = handleApiError(
          new ValidationError(`Twitter URL: ${urlValidation.error}`),
          "Profile PATCH"
        )
        return createSecureResponse(error, statusCode)
      }
      updateData.twitter_url = urlValidation.sanitized
    }

    if (linkedin_url !== undefined && linkedin_url) {
      const urlValidation = validateUrl(linkedin_url)
      if (!urlValidation.isValid) {
        const { statusCode, error } = handleApiError(
          new ValidationError(`LinkedIn URL: ${urlValidation.error}`),
          "Profile PATCH"
        )
        return createSecureResponse(error, statusCode)
      }
      updateData.linkedin_url = urlValidation.sanitized
    }

    if (github_url !== undefined && github_url) {
      const urlValidation = validateUrl(github_url)
      if (!urlValidation.isValid) {
        const { statusCode, error } = handleApiError(
          new ValidationError(`GitHub URL: ${urlValidation.error}`),
          "Profile PATCH"
        )
        return createSecureResponse(error, statusCode)
      }
      updateData.github_url = urlValidation.sanitized
    }

    if (website_url !== undefined && website_url) {
      const urlValidation = validateUrl(website_url)
      if (!urlValidation.isValid) {
        const { statusCode, error } = handleApiError(
          new ValidationError(`Website URL: ${urlValidation.error}`),
          "Profile PATCH"
        )
        return createSecureResponse(error, statusCode)
      }
      updateData.website_url = urlValidation.sanitized
    }

    if (location !== undefined) {
      const locationValidation = validateText(location, { maxLength: 100 })
      if (!locationValidation.isValid) {
        const { statusCode, error } = handleApiError(
          new ValidationError(`Location: ${locationValidation.error}`),
          "Profile PATCH"
        )
        return createSecureResponse(error, statusCode)
      }
      updateData.location = locationValidation.sanitized
    }

    if (display_name !== undefined) {
      const nameValidation = validateText(display_name, { maxLength: 100 })
      if (!nameValidation.isValid) {
        const { statusCode, error } = handleApiError(
          new ValidationError(`Display name: ${nameValidation.error}`),
          "Profile PATCH"
        )
        return createSecureResponse(error, statusCode)
      }
      updateData.display_name = nameValidation.sanitized
    }
    if (notification_preferences !== undefined) {
      // @ts-ignore - notification_preferences is a JSONB column
      updateData.notification_preferences = notification_preferences
    }

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
        return createSecureResponse({ error: "Failed to create profile" }, 500)
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
        return createSecureResponse(apiError, statusCode)
      }

      logger.info("User profile updated", {
        context: "Profile",
        userId: session.user.id,
        data: { fields: Object.keys(updateData) },
      })

      return createSecureResponse({ profile: updatedProfile })
    }

    // Fetch the newly created profile
    const { data: newProfile } = await supabase
      .from("user_profiles")
      .select()
      .eq("id", session.user.id)
      .single()

    return createSecureResponse({ profile: newProfile })
  } catch (error) {
    const { statusCode, error: apiError } = handleApiError(error, "Profile PATCH")
    return createSecureResponse(apiError, statusCode)
  }
}

