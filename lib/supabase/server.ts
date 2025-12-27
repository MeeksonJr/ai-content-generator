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

  // Create a custom storage adapter for Next.js 15 cookies
  const storageAdapter = {
    getItem: (key: string): string | null => {
      const cookie = cookieStore.get(key)
      return cookie?.value ?? null
    },
    setItem: (key: string, value: string): void => {
      // In Next.js 15, we can't set cookies directly in server components
      // This is handled by the auth flow in route handlers
      // For server components, we only read cookies
    },
    removeItem: (key: string): void => {
      // Same as above - handled in route handlers
    },
  }

  return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: storageAdapter,
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export const createServerClient = async () => {
  return createClient()
}
