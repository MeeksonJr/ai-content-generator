import "@/lib/utils/supabase-env"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import type { Database } from "@/lib/database.types"

export const createClient = () => {
  const cookieStore = cookies()
  return createServerComponentClient<Database, "public">({ cookies: () => cookieStore })
}

export const createServerClient = () => {
  const cookieStore = cookies()
  return createServerComponentClient<Database, "public">({ cookies: () => cookieStore })
}
