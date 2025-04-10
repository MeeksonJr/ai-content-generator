"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function SubscriptionSuccessPage() {
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const updateSubscription = async () => {
      try {
        setLoading(true)

        // Get subscription ID and token from URL
        const urlParams = new URLSearchParams(window.location.search)
        const subscriptionId = urlParams.get("subscription_id")
        const token = urlParams.get("token")

        if (!subscriptionId || !token) {
          throw new Error("Missing subscription information")
        }

        // Call API to update subscription status
        const response = await fetch("/api/paypal/subscription-success", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ subscriptionId, token }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to update subscription")
        }

        toast({
          title: "Subscription Activated",
          description: "Your subscription has been successfully activated.",
        })
      } catch (error) {
        console.error("Error updating subscription:", error)
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to update subscription",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    updateSubscription()
  }, [toast])

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md bg-gray-900 border-gray-800">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl flex justify-center items-center gap-2">
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : (
                <CheckCircle className="h-6 w-6 text-green-500" />
              )}
              Subscription {loading ? "Processing" : "Successful"}
            </CardTitle>
            <CardDescription>
              {loading
                ? "We're processing your subscription. Please wait..."
                : "Your subscription has been successfully activated."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!loading && (
              <>
                <p className="text-center text-muted-foreground">
                  Thank you for subscribing to our service. You now have access to all the features included in your
                  plan.
                </p>
                <div className="flex justify-center">
                  <Button onClick={() => router.push("/dashboard/subscription")}>View Subscription Details</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
