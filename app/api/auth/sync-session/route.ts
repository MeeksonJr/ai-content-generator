import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getSupabaseUrl } from "@/lib/utils/supabase-env"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { access_token, refresh_token } = body

    if (!access_token) {
      return NextResponse.json({ error: "Access token required" }, { status: 400 })
    }

    const supabase = await createSupabaseRouteClient()
    
    // Set the session using the tokens from the client
    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token: refresh_token || access_token,
    })

    if (error || !data.session) {
      return NextResponse.json({ error: "Failed to set session" }, { status: 401 })
    }

    // Extract project ref for cookie names (must match middleware)
    const supabaseUrl = getSupabaseUrl()
    const projectRef = supabaseUrl?.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1] || "default"
    const sessionCookieName = `sb-${projectRef}-auth-token`
    const refreshCookieName = `${sessionCookieName}.refresh`

    // Create response with cookies explicitly set
    const response = NextResponse.json({ 
      success: true,
      user: data.user 
    })

    // Set cookies explicitly to ensure they're available to middleware
    const isProduction = process.env.NODE_ENV === "production"
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    }

    // Set the access token cookie
    response.cookies.set(sessionCookieName, access_token, cookieOptions)
    
    // Set the refresh token cookie if provided
    if (refresh_token) {
      response.cookies.set(refreshCookieName, refresh_token, cookieOptions)
    }

    return response
  } catch (error) {
    console.error("Error syncing session:", error)
    return NextResponse.json(
      { error: "Failed to sync session" },
      { status: 500 }
    )
  }
}

