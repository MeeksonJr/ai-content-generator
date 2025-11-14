import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/utils/supabase-env"

/**
 * Creates a Supabase client for server-side API routes
 * Uses service role key for admin operations
 */
export const createServerSupabaseClient = () => {
  const supabaseUrl = getSupabaseUrl()
  const supabaseKey = getSupabaseServiceRoleKey()

  if (!supabaseUrl) {
    throw new Error("Missing Supabase URL. Please set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL environment variable.")
  }

  if (!supabaseKey) {
    throw new Error("Missing Supabase Service Role Key. Please set SUPABASE_SERVICE_ROLE_KEY environment variable.")
  }

  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

