const sanitizeSupabaseUrl = (rawValue?: string | null) => {
  if (!rawValue) {
    return undefined
  }

  let value = rawValue.trim()
  if (!value) {
    return undefined
  }

  // Ensure protocol is present
  if (!value.startsWith("http")) {
    value = `https://${value}`
  }

  // Remove trailing slashes
  value = value.replace(/\/+$/, "")

  // Append missing .co if the domain ends with `.supabase`
  value = value.replace(/\.supabase(?!\.co)/, ".supabase.co")

  return value
}

let cachedSupabaseUrl: string | undefined

export const getSupabaseUrl = () => {
  if (cachedSupabaseUrl) {
    return cachedSupabaseUrl
  }

  const url = sanitizeSupabaseUrl(process.env.SUPABASE_URL) || sanitizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)

  if (url) {
    cachedSupabaseUrl = url
    process.env.SUPABASE_URL = url
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      process.env.NEXT_PUBLIC_SUPABASE_URL = url
    }
  }

  return cachedSupabaseUrl
}

export const getSupabaseAnonKey = () => process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const getSupabaseServiceRoleKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY

export const getSupabaseAnonConfig = () => {
  const supabaseUrl = getSupabaseUrl()
  const supabaseKey = getSupabaseAnonKey()

  if (!supabaseUrl) {
    throw new Error("Missing Supabase URL. Please set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL environment variable.")
  }

  if (!supabaseKey) {
    throw new Error("Missing Supabase anon key. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY.")
  }

  return { supabaseUrl, supabaseKey }
}

