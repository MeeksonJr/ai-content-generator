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
    <div className="flex min-h-screen flex-col items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-950 dark:to-gray-900 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-400 rounded-full blur-3xl"></div>
      </div>
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-6 sm:mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4 sm:mb-6 group">
            <Sparkles className="h-7 w-7 sm:h-8 sm:w-8 text-primary group-hover:scale-110 transition-transform" />
            <span className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">
              AI Content Generator
            </span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome Back
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Sign in to your account or create a new one to get started
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8">
          <AuthForm />
        </div>
        <div className="mt-6 sm:mt-8 text-center">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            By continuing, you agree to our{" "}
            <Link href="/terms" className="text-primary hover:underline font-medium">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-primary hover:underline font-medium">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
