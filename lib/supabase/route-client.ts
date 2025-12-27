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

  return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: storageAdapter,
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

