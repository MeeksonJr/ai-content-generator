import "@/lib/utils/supabase-env"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import type { Database } from "@/lib/database.types"
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/utils/supabase-env"

export const createSupabaseRouteClient = async () => {
  const cookieStore = await cookies()
  const supabaseUrl = getSupabaseUrl()
  const supabaseAnonKey = getSupabaseAnonKey()

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables")
  }

  // Extract project ref for cookie names
  const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1] || "default"
  const sessionCookieName = `sb-${projectRef}-auth-token`
  const refreshCookieName = `${sessionCookieName}.refresh`

  // Create a custom storage adapter for route handlers
  const storageAdapter = {
    getItem: (key: string): string | null => {
      const cookie = cookieStore.get(key)
      return cookie?.value ?? null
    },
    setItem: (key: string, value: string): void => {
      cookieStore.set(key, value, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      })
    },
    removeItem: (key: string): void => {
      cookieStore.delete(key)
    },
  }

  const supabase = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: storageAdapter,
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // If we have tokens in cookies, set the session to ensure it's available
  const accessToken = cookieStore.get(sessionCookieName)?.value
  const refreshToken = cookieStore.get(refreshCookieName)?.value

  if (accessToken && refreshToken) {
    try {
      // Set the session from tokens to ensure it's available for getSession()
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
    } catch (error) {
      // If setting session fails, that's okay - getSession() will still work
      // with whatever is in the storage adapter
      console.warn("Failed to set session from cookies in route client:", error)
    }
  }

  return supabase
}

