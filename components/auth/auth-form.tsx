"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Loader2, Eye, EyeOff, Sparkles } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useToast } from "@/components/ui/use-toast"
import { ForgotPasswordDialog } from "@/components/auth/forgot-password-dialog"
import { ResendVerificationDialog } from "@/components/auth/resend-verification-dialog"

export function AuthForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<"sign-in" | "sign-up">("sign-in")
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, label: "", color: "" }
    
    let strength = 0
    if (password.length >= 8) strength++
    if (password.length >= 12) strength++
    if (/[a-z]/.test(password)) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^a-zA-Z0-9]/.test(password)) strength++

    const strengthMap = [
      { label: "Very Weak", color: "bg-red-500", value: 0 },
      { label: "Weak", color: "bg-orange-500", value: 20 },
      { label: "Fair", color: "bg-yellow-500", value: 40 },
      { label: "Good", color: "bg-blue-500", value: 60 },
      { label: "Strong", color: "bg-green-500", value: 80 },
      { label: "Very Strong", color: "bg-green-600", value: 100 },
    ]

    const index = Math.min(strength, 5)
    return {
      strength: strengthMap[index].value,
      label: strengthMap[index].label,
      color: strengthMap[index].color,
    }
  }

  const passwordStrength = getPasswordStrength(password)

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      // After successful login, sync session to cookies via API
      // This ensures the server can read the session
      if (data.session) {
        try {
          // Make a request to sync the session to cookies
          const syncResponse = await fetch("/api/auth/sync-session", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include", // Important: include cookies
            body: JSON.stringify({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
            }),
          })

          if (!syncResponse.ok) {
            console.warn("Failed to sync session to cookies, but login succeeded")
          } else {
            // Wait a bit to ensure cookies are set before redirecting
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        } catch (syncError) {
          console.warn("Error syncing session:", syncError)
          // Don't fail the login if sync fails
        }
      }

      // Get redirect URL from query params if present
      const searchParams = new URLSearchParams(window.location.search)
      const redirectTo = searchParams.get("redirectedFrom") || "/dashboard"
      
      router.push(redirectTo)
      router.refresh()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        throw error
      }

      setView("sign-in")
      toast({
        title: "Check your email",
        description: "We've sent you a confirmation link. Please check your email to verify your account.",
      })
      setEmail("")
      setPassword("")
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
          </div>
        <CardTitle className="text-2xl">Welcome</CardTitle>
        <CardDescription>Sign in to your account or create a new one</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={view} onValueChange={(v) => setView(v as "sign-in" | "sign-up")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sign-in">Sign In</TabsTrigger>
            <TabsTrigger value="sign-up">Sign Up</TabsTrigger>
          </TabsList>
            <AnimatePresence mode="wait">
              <TabsContent value="sign-in" key="sign-in">
                <motion.form
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleSignIn}
                  className="space-y-4 mt-4"
                >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                      className="transition-all focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                    <Label htmlFor="password-signin">Password</Label>
                    <div className="relative">
                <Input
                        id="password-signin"
                        type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                        className="pr-10 transition-all focus:ring-2 focus:ring-primary"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    <div className="flex justify-end">
                      <ForgotPasswordDialog />
                    </div>
              </div>
                  <AnimatePresence>
              {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
                      </motion.div>
              )}
                  </AnimatePresence>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
                </motion.form>
          </TabsContent>
              <TabsContent value="sign-up" key="sign-up">
                <motion.form
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleSignUp}
                  className="space-y-4 mt-4"
                >
              <div className="space-y-2">
                    <Label htmlFor="email-signup">Email</Label>
                <Input
                      id="email-signup"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                      className="transition-all focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                    <Label htmlFor="password-signup">Password</Label>
                    <div className="relative">
                <Input
                        id="password-signup"
                        type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                        className="pr-10 transition-all focus:ring-2 focus:ring-primary"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    {password && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Password strength:</span>
                          <span className={`font-medium ${
                            passwordStrength.strength < 40 ? "text-red-500" :
                            passwordStrength.strength < 60 ? "text-yellow-500" :
                            passwordStrength.strength < 80 ? "text-blue-500" : "text-green-500"
                          }`}>
                            {passwordStrength.label}
                          </span>
                        </div>
                        <Progress value={passwordStrength.strength} className="h-2" />
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>Password should contain:</p>
                          <ul className="list-disc list-inside space-y-0.5">
                            <li className={password.length >= 8 ? "text-green-500" : ""}>
                              At least 8 characters
                            </li>
                            <li className={/[a-z]/.test(password) && /[A-Z]/.test(password) ? "text-green-500" : ""}>
                              Upper and lowercase letters
                            </li>
                            <li className={/[0-9]/.test(password) ? "text-green-500" : ""}>
                              At least one number
                            </li>
                            <li className={/[^a-zA-Z0-9]/.test(password) ? "text-green-500" : ""}>
                              At least one special character
                            </li>
                          </ul>
                        </div>
                      </motion.div>
                    )}
              </div>
                  <AnimatePresence>
              {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
                      </motion.div>
              )}
                  </AnimatePresence>
                  {view === "sign-up" && (
                    <div className="flex justify-center text-sm">
                      <ResendVerificationDialog />
                    </div>
                  )}
                  <Button type="submit" className="w-full" disabled={loading || (view === "sign-up" && passwordStrength.strength < 40)}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing Up...
                  </>
                ) : (
                  "Sign Up"
                )}
              </Button>
                </motion.form>
          </TabsContent>
            </AnimatePresence>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground text-center">
            By continuing, you agree to our{" "}
            <a href="/terms" className="text-primary hover:underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </a>
            .
        </p>
      </CardFooter>
    </Card>
    </motion.div>
  )
}
