import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { logger } from "@/lib/utils/logger"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { AuthenticationError, ValidationError, handleApiError } from "@/lib/utils/error-handler"
import type { Database } from "@/lib/database.types"
import { createSecureResponse, handlePreflight } from "@/lib/utils/security"
import { FILE_CONFIG, STORAGE_BUCKETS } from "@/lib/constants/app.constants"

export async function POST(request: NextRequest) {
  try {
    // Handle preflight OPTIONS request
    const preflightResponse = handlePreflight(request)
    if (preflightResponse) return preflightResponse

    const supabase = await createSupabaseRouteClient()
    const serverSupabase = createServerSupabaseClient()

    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      const { statusCode, error } = handleApiError(new AuthenticationError(), "Avatar Upload")
      return createSecureResponse(error, statusCode)
    }

    // Get the file from the request
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      const { statusCode, error } = handleApiError(new ValidationError("No file provided"), "Avatar Upload")
      return createSecureResponse(error, statusCode)
    }

    // Validate file type
    if (!FILE_CONFIG.ALLOWED_IMAGE_TYPES.includes(file.type as typeof FILE_CONFIG.ALLOWED_IMAGE_TYPES[number])) {
      const { statusCode, error } = handleApiError(
        new ValidationError(`File must be one of: ${FILE_CONFIG.ALLOWED_IMAGE_TYPES.join(", ")}`),
        "Avatar Upload"
      )
      return createSecureResponse(error, statusCode)
    }

    // Validate file size
    if (file.size > FILE_CONFIG.MAX_AVATAR_SIZE) {
      const { statusCode, error } = handleApiError(
        new ValidationError(`File size must be less than ${FILE_CONFIG.MAX_AVATAR_SIZE / 1024 / 1024}MB`),
        "Avatar Upload"
      )
      return createSecureResponse(error, statusCode)
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop() || "jpg"
    const fileName = `${session.user.id}/${Date.now()}.${fileExt}`
    const filePath = `${STORAGE_BUCKETS.AVATARS}/${fileName}`

    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await serverSupabase.storage
      .from(STORAGE_BUCKETS.AVATARS)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true, // Replace if exists
      })

    if (uploadError) {
      const { statusCode, error: apiError } = handleApiError(uploadError, "Avatar Upload")
      return createSecureResponse(apiError, statusCode)
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = serverSupabase.storage.from(STORAGE_BUCKETS.AVATARS).getPublicUrl(fileName)

    // Update user profile with avatar URL
    const { error: updateError } = await supabase
      .from("user_profiles")
      // @ts-ignore - Type will be correct after database migration
      .update({
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", session.user.id)

    if (updateError) {
      // If profile doesn't exist, create it
      const { error: insertError } = await supabase.from("user_profiles").insert({
        id: session.user.id,
        avatar_url: publicUrl,
        is_admin: false,
      } as any)

      if (insertError) {
        const { statusCode, error: apiError } = handleApiError(insertError, "Avatar Upload")
        return createSecureResponse(apiError, statusCode)
      }
    }

    logger.info("Avatar uploaded", {
      context: "Profile",
      userId: session.user.id,
      data: { fileName, publicUrl },
    })

    return createSecureResponse({ avatar_url: publicUrl })
  } catch (error) {
    const { statusCode, error: apiError } = handleApiError(error, "Avatar Upload")
    return createSecureResponse(apiError, statusCode)
  }
}

