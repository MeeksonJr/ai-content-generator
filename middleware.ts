import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import type { Database } from "@/lib/database.types"
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/utils/supabase-env"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  const supabaseUrl = getSupabaseUrl()
  const supabaseAnonKey = getSupabaseAnonKey()

  if (!supabaseUrl || !supabaseAnonKey) {
    // If Supabase is not configured, allow the request to continue
    return res
  }

  // Extract project ref for cookie names
  const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1] || "default"
  const sessionCookieName = `sb-${projectRef}-auth-token`
  const refreshCookieName = `${sessionCookieName}.refresh`
  
  // Check if we have session cookies
  const accessToken = req.cookies.get(sessionCookieName)?.value
  const refreshToken = req.cookies.get(refreshCookieName)?.value

  // Create Supabase client with cookie-based storage for middleware
  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: {
        getItem: (key: string): string | null => {
          const cookie = req.cookies.get(key)
          return cookie?.value ?? null
        },
        setItem: (key: string, value: string): void => {
          // Set cookie in response
          res.cookies.set(key, value, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 365, // 1 year
          })
        },
        removeItem: (key: string): void => {
          // Remove cookie from response
          res.cookies.delete(key)
        },
      },
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // If we have tokens in cookies, set the session
  let session = null
  if (accessToken && refreshToken) {
    try {
      const { data } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      session = data.session
    } catch (error) {
      // If setting session fails, try to get existing session
      const result = await supabase.auth.getSession()
      session = result.data?.session ?? null
    }
  } else {
    // Try to get existing session
    const result = await supabase.auth.getSession()
    session = result.data?.session ?? null
  }

  // If there's no session and the user is trying to access a protected route
  if (!session && req.nextUrl.pathname.startsWith("/dashboard")) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = "/login"
    redirectUrl.searchParams.set("redirectedFrom", req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: ["/dashboard/:path*"],
}
