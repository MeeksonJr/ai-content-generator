"use client"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/utils/supabase-env"

let supabaseClient: ReturnType<typeof createSupabaseClient<Database>> | null = null

export function createClient() {
  if (!supabaseClient) {
    const supabaseUrl = getSupabaseUrl()
    const supabaseAnonKey = getSupabaseAnonKey()

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing Supabase environment variables")
    }

    // Use Supabase's default localStorage storage
    // Cookie syncing is handled separately via API after login
    // This prevents issues where cookies might contain just tokens instead of full session objects
    
    // Clear any potentially corrupted session data from previous implementations
    if (typeof window !== "undefined") {
      const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1] || "default"
      const sessionKey = `sb-${projectRef}-auth-token`
      try {
        const stored = localStorage.getItem(sessionKey)
        // If stored value is a JWT token (starts with eyJ), it's corrupted - clear it
        if (stored && stored.startsWith("eyJ") && !stored.includes("{")) {
          localStorage.removeItem(sessionKey)
          console.log("Cleared corrupted session data from localStorage")
        }
      } catch {
        // Ignore errors when checking/clearing
      }
    }
    
    supabaseClient = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })

    // Listen for auth state changes and sync to cookies via API
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (session?.access_token) {
          // Sync session to cookies via API so server can read it
          try {
            await fetch("/api/auth/sync-session", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
              body: JSON.stringify({
                access_token: session.access_token,
                refresh_token: session.refresh_token,
              }),
            })
          } catch (error) {
            console.warn("Failed to sync session to cookies:", error)
          }
        }
      }
    })
  }
  return supabaseClient
}

// For backwards compatibility
export { createClient as default }
