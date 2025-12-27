import { NextResponse } from "next/server"
import { logger } from "@/lib/utils/logger"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { AuthenticationError, ValidationError, handleApiError } from "@/lib/utils/error-handler"
import type { Database } from "@/lib/database.types"

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseRouteClient()
    const serverSupabase = createServerSupabaseClient()

    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      const { statusCode, error } = handleApiError(new AuthenticationError(), "Avatar Upload")
      return NextResponse.json(error, { status: statusCode })
    }

    // Get the file from the request
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      const { statusCode, error } = handleApiError(new ValidationError("No file provided"), "Avatar Upload")
      return NextResponse.json(error, { status: statusCode })
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      const { statusCode, error } = handleApiError(
        new ValidationError("File must be an image (JPG, PNG, or GIF)"),
        "Avatar Upload"
      )
      return NextResponse.json(error, { status: statusCode })
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      const { statusCode, error } = handleApiError(
        new ValidationError("File size must be less than 5MB"),
        "Avatar Upload"
      )
      return NextResponse.json(error, { status: statusCode })
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop()
    const fileName = `${session.user.id}/${Date.now()}.${fileExt}`
    const filePath = `avatars/${fileName}`

    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await serverSupabase.storage
      .from("avatars")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true, // Replace if exists
      })

    if (uploadError) {
      const { statusCode, error: apiError } = handleApiError(uploadError, "Avatar Upload")
      return NextResponse.json(apiError, { status: statusCode })
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = serverSupabase.storage.from("avatars").getPublicUrl(filePath)

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
        return NextResponse.json(apiError, { status: statusCode })
      }
    }

    logger.info("Avatar uploaded", {
      context: "Profile",
      userId: session.user.id,
      data: { filePath, publicUrl },
    })

    return NextResponse.json({ avatar_url: publicUrl })
  } catch (error) {
    const { statusCode, error: apiError } = handleApiError(error, "Avatar Upload")
    return NextResponse.json(apiError, { status: statusCode })
  }
}

