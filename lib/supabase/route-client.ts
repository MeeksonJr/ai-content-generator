import "@/lib/utils/supabase-env"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import type { Database } from "@/lib/database.types"

export const createSupabaseRouteClient = () => {
  const cookieStore = cookies()
  return createRouteHandlerClient<Database, "public">({
    cookies: () => cookieStore,
  })
}

