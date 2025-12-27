import "@/lib/utils/supabase-env"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import type { Database } from "@/lib/database.types"
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/utils/supabase-env"

export const createClient = async () => {
  const cookieStore = await cookies()
  const supabaseUrl = getSupabaseUrl()
  const supabaseAnonKey = getSupabaseAnonKey()

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables")
  }

  // Extract project ref from Supabase URL to build cookie names
  // URL format: https://<project-ref>.supabase.co
  const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1] || "default"
  
  // Read all Supabase cookies once at initialization into memory
  // Supabase cookie format: sb-<project-ref>-auth-token, sb-<project-ref>-auth-token.0, etc.
  const memoryStorage: Record<string, string> = {}
  
  try {
    // Read all cookies once and store Supabase-related ones in memory
    const allCookies = cookieStore.getAll()
    for (const cookie of allCookies) {
      // Match Supabase cookie patterns
      if (
        cookie.name.startsWith(`sb-${projectRef}-`) ||
        cookie.name.includes("supabase.auth") ||
        cookie.name.startsWith("sb-")
      ) {
        memoryStorage[cookie.name] = cookie.value
      }
    }
  } catch (error) {
    // Silently fail - we'll just have no session data
    console.warn("Failed to read cookies for Supabase session:", error)
  }

  // Create a read-only storage adapter that only uses memory
  // This prevents any cookie operations after initialization
  // All methods are wrapped in try-catch to prevent errors from breaking the app
  const storageAdapter = {
    getItem: (key: string): string | null => {
      try {
        // Only return from memory - never access cookies again
        return memoryStorage[key] ?? null
      } catch {
        // If anything fails, return null (no session)
        return null
      }
    },
    setItem: (_key: string, _value: string): void => {
      try {
        // Store in memory only - cookies can't be modified in server components
        // This won't persist, but that's fine for server components
        memoryStorage[_key] = _value
      } catch {
        // Silently ignore - cookies can't be modified in server components
      }
    },
    removeItem: (key: string): void => {
      try {
        // Remove from memory only - never touch cookies
        delete memoryStorage[key]
      } catch {
        // Silently ignore - this is called during auto-refresh which we can't control
        // The error is transient and doesn't affect functionality
      }
    },
  }

  // Create client with storage that never touches cookies after init
  const client = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: storageAdapter,
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
      flowType: "pkce",
    },
  })

  // Disable any background refresh mechanisms
  // @ts-ignore - Internal Supabase property to disable refresh
  if (client.auth) {
    // Prevent any automatic token refresh
    try {
      // Clear any existing refresh timers
      // @ts-ignore
      if (client.auth._refreshTimer) {
        // @ts-ignore
        clearInterval(client.auth._refreshTimer)
      }
    } catch {
      // Ignore if property doesn't exist
    }
  }

  return client
}

export const createServerClient = async () => {
  return createClient()
}
