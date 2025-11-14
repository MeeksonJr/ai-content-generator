"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Check, AlertCircle, Info } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Set to true to enable direct subscription without PayPal for testing
const ENABLE_DIRECT_SUBSCRIPTION = process.env.NODE_ENV

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)
  const [subscription, setSubscription] = useState<any>(null)
  const [usageLimits, setUsageLimits] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [paypalUnavailable, setPaypalUnavailable] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchSubscriptionData()
  }, [])

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/subscription")

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch subscription data" }))
        throw new Error(errorData.error || "Failed to fetch subscription data")
      }

      const data = await response.json()
      setSubscription(data.subscription)
      setUsageLimits(data.usageLimits)
    } catch (error) {
      console.error("Error fetching subscription data:", error)
      setError(error instanceof Error ? error.message : "An unknown error occurred")
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load subscription information",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async (planType: string) => {
    try {
      setSubscribing(true)
      setError(null)

      const response = await fetch("/api/subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planType }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to process subscription" }))
        throw new Error(errorData.error || "Failed to process subscription")
      }

      const data = await response.json()
      setSubscription(data.subscription)

      // Refresh subscription data to get updated limits
      await fetchSubscriptionData()

      toast({
        title: "Subscription updated",
        description: `You are now subscribed to the ${planType} plan.`,
      })
    } catch (error) {
      console.error("Error subscribing:", error)
      setError(error instanceof Error ? error.message : "An unknown error occurred")
      toast({
        title: "Error subscribing",
        description: error instanceof Error ? error.message : "Failed to process subscription",
        variant: "destructive",
      })
    } finally {
      setSubscribing(false)
    }
  }

  const handlePayPalSubscribe = async (planType: string) => {
    try {
      setSubscribing(true)
      setError(null)
      setPaypalUnavailable(false)

      const response = await fetch("/api/paypal/create-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planType }),
      })

      // First check if the response is ok
      if (!response.ok) {
        // Try to get the error message from the response
        const errorText = await response.text()
        let errorMessage = "Failed to create PayPal subscription"

        try {
          // Try to parse the error as JSON
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error || errorMessage
        } catch (parseError) {
          // If parsing fails, use the raw error text (truncated)
          errorMessage = `Server error: ${errorText.substring(0, 100)}...`
        }

        // If it's an internal server error, suggest using direct subscription
        if (response.status === 500 && ENABLE_DIRECT_SUBSCRIPTION) {
          setPaypalUnavailable(true)
          throw new Error(`${errorMessage} - You can try the direct subscription option instead.`)
        }

        throw new Error(errorMessage)
      }

      // If response is ok, parse the JSON
      const data = await response.json()

      if (!data.approvalUrl) {
        throw new Error("No approval URL returned from server")
      }

      // Redirect to PayPal approval URL
      window.location.href = data.approvalUrl
    } catch (error) {
      console.error("Error creating PayPal subscription:", error)
      setError(error instanceof Error ? error.message : "An unknown error occurred")
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create PayPal subscription",
        variant: "destructive",
      })
      setSubscribing(false)
    }
  }

  // Direct subscription without PayPal (for testing or when PayPal is unavailable)
  const handleDirectSubscribe = async (planType: string) => {
    try {
      setSubscribing(true)
      setError(null)

      // This uses the regular subscription API which doesn't require PayPal
      await handleSubscribe(planType)

      toast({
        title: "Subscription activated",
        description: `You are now subscribed to the ${planType} plan directly.`,
      })
    } catch (error) {
      console.error("Error with direct subscription:", error)
      setError(error instanceof Error ? error.message : "An unknown error occurred")
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process direct subscription",
        variant: "destructive",
      })
    } finally {
      setSubscribing(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!subscription || subscription.plan_type === "free") {
      return
    }

    const confirmed = window.confirm("Are you sure you want to cancel your current subscription?")
    if (!confirmed) {
      return
    }

    try {
      setCancelling(true)
      setError(null)

      const response = await fetch("/api/paypal/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: "User initiated cancellation from dashboard" }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to cancel subscription" }))
        throw new Error(errorData.error || "Failed to cancel subscription")
      }

      toast({
        title: "Subscription cancelled",
        description: "Your subscription has been cancelled successfully.",
      })

      await fetchSubscriptionData()
    } catch (error) {
      console.error("Error canceling subscription:", error)
      toast({
        title: "Cancellation failed",
        description: error instanceof Error ? error.message : "Failed to cancel subscription",
        variant: "destructive",
      })
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Subscription</h2>
          <p className="text-muted-foreground">Manage your subscription plan and billing information</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {paypalUnavailable && ENABLE_DIRECT_SUBSCRIPTION && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>PayPal Unavailable</AlertTitle>
            <AlertDescription>
              PayPal integration is currently unavailable. You can use the direct subscription option instead.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          {/* Free Plan */}
          <Card className={subscription?.plan_type === "free" ? "border-primary" : ""}>
            <CardHeader>
              <CardTitle className="flex justify-between">
                Free
                {subscription?.plan_type === "free" && (
                  <Badge variant="outline" className="ml-2">
                    Current Plan
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Basic features for personal use</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold mb-4">$0</div>
              <ul className="space-y-2 mb-4">
                <li className="flex items-center">
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  <span>5 content generations per month</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  <span>1,000 character limit</span>
                </li>
                <li className="flex items-center opacity-50">
                  <span className="h-4 w-4 mr-2">✗</span>
                  <span>Sentiment analysis</span>
                </li>
                <li className="flex items-center opacity-50">
                  <span className="h-4 w-4 mr-2">✗</span>
                  <span>Keyword extraction</span>
                </li>
                <li className="flex items-center opacity-50">
                  <span className="h-4 w-4 mr-2">✗</span>
                  <span>Text summarization</span>
                </li>
                <li className="flex items-center opacity-50">
                  <span className="h-4 w-4 mr-2">✗</span>
                  <span>API access</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => handleSubscribe("free")}
                disabled={subscription?.plan_type === "free" || subscribing}
                className="w-full"
                variant={subscription?.plan_type === "free" ? "outline" : "default"}
              >
                {subscribing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : subscription?.plan_type === "free" ? (
                  "Current Plan"
                ) : (
                  "Downgrade"
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Professional Plan */}
          <Card className={subscription?.plan_type === "professional" ? "border-primary" : ""}>
            <CardHeader>
              <CardTitle className="flex justify-between">
                Professional
                {subscription?.plan_type === "professional" && (
                  <Badge variant="outline" className="ml-2">
                    Current Plan
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Advanced features for professionals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold mb-4">$19.99</div>
              <ul className="space-y-2 mb-4">
                <li className="flex items-center">
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  <span>50 content generations per month</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  <span>5,000 character limit</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  <span>Sentiment analysis</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  <span>Keyword extraction</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  <span>Text summarization</span>
                </li>
                <li className="flex items-center opacity-50">
                  <span className="h-4 w-4 mr-2">✗</span>
                  <span>API access</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <Button
                onClick={() => handlePayPalSubscribe("professional")}
                disabled={subscription?.plan_type === "professional" || subscribing || paypalUnavailable}
                className="w-full"
                variant={subscription?.plan_type === "professional" ? "outline" : "default"}
              >
                {subscribing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : subscription?.plan_type === "professional" ? (
                  "Current Plan"
                ) : (
                  "Subscribe with PayPal"
                )}
              </Button>

              {ENABLE_DIRECT_SUBSCRIPTION && (
                <Button
                  onClick={() => handleDirectSubscribe("professional")}
                  disabled={subscription?.plan_type === "professional" || subscribing}
                  className="w-full"
                  variant="outline"
                >
                  {subscribing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Direct Subscription (Test)"
                  )}
                </Button>
              )}
              {subscription?.plan_type === "professional" && (
                <Button
                  onClick={handleCancelSubscription}
                  disabled={cancelling}
                  variant="destructive"
                  className="w-full"
                >
                  {cancelling ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    "Cancel Subscription"
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* Enterprise Plan */}
          <Card className={subscription?.plan_type === "enterprise" ? "border-primary" : ""}>
            <CardHeader>
              <CardTitle className="flex justify-between">
                Enterprise
                {subscription?.plan_type === "enterprise" && (
                  <Badge variant="outline" className="ml-2">
                    Current Plan
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Maximum features for businesses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold mb-4">$49.99</div>
              <ul className="space-y-2 mb-4">
                <li className="flex items-center">
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  <span>Unlimited content generations</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  <span>10,000 character limit</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  <span>Sentiment analysis</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  <span>Keyword extraction</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  <span>Text summarization</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  <span>API access</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <Button
                onClick={() => handlePayPalSubscribe("enterprise")}
                disabled={subscription?.plan_type === "enterprise" || subscribing || paypalUnavailable}
                className="w-full"
                variant={subscription?.plan_type === "enterprise" ? "outline" : "default"}
              >
                {subscribing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : subscription?.plan_type === "enterprise" ? (
                  "Current Plan"
                ) : (
                  "Subscribe with PayPal"
                )}
              </Button>

              {ENABLE_DIRECT_SUBSCRIPTION && (
                <Button
                  onClick={() => handleDirectSubscribe("enterprise")}
                  disabled={subscription?.plan_type === "enterprise" || subscribing}
                  className="w-full"
                  variant="outline"
                >
                  {subscribing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Direct Subscription (Test)"
                  )}
                </Button>
              )}
              {subscription?.plan_type === "enterprise" && (
                <Button
                  onClick={handleCancelSubscription}
                  disabled={cancelling}
                  variant="destructive"
                  className="w-full"
                >
                  {cancelling ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    "Cancel Subscription"
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>

        <div className="mt-8">
          <h3 className="text-xl font-bold mb-4">Subscription Details</h3>
          <Card>
            <CardContent className="pt-6">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Current Plan</dt>
                  <dd className="mt-1 text-lg font-semibold">
                    {subscription?.plan_type
                      ? subscription.plan_type.charAt(0).toUpperCase() + subscription.plan_type.slice(1)
                      : "None"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                  <dd className="mt-1">
                    <Badge variant={subscription?.status === "active" ? "default" : "destructive"}>
                      {subscription?.status
                        ? subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)
                        : "Inactive"}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Started On</dt>
                  <dd className="mt-1 text-lg font-semibold">
                    {subscription?.started_at ? new Date(subscription.started_at).toLocaleDateString() : "N/A"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Next Billing Date</dt>
                  <dd className="mt-1 text-lg font-semibold">
                    {subscription?.expires_at
                      ? new Date(subscription.expires_at).toLocaleDateString()
                      : subscription?.plan_type === "free"
                        ? "N/A"
                        : "End of current month"}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
