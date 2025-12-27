import { AuthForm } from "@/components/auth/auth-form"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Sparkles } from "lucide-react"

export default async function LoginPage() {
  let session = null
  
  try {
    const supabase = await createClient()
    const result = await supabase.auth.getSession()
    session = result.data?.session ?? null
  } catch (error) {
    // Ignore transient cookie errors - they don't affect functionality
    // The session check will fail gracefully and show the login form
    console.warn("Session check failed (this is expected in server components):", error)
  }

  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">AI Content Generator</span>
          </Link>
          <p className="mt-2 text-muted-foreground">Sign in to your account or create a new one</p>
        </div>
        <AuthForm />
      </div>
    </div>
  )
}
