import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

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

    // The route client will automatically set cookies
    return NextResponse.json({ 
      success: true,
      user: data.user 
    })
  } catch (error) {
    console.error("Error syncing session:", error)
    return NextResponse.json(
      { error: "Failed to sync session" },
      { status: 500 }
    )
  }
}

