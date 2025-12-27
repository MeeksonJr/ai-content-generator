"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Loader2, Save, RefreshCw, AlertCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface UsageLimit {
  id?: string
  plan_type: string
  monthly_content_limit: number
  max_content_length: number
  sentiment_analysis_enabled: boolean
  keyword_extraction_enabled: boolean
  text_summarization_enabled: boolean
  api_access_enabled: boolean
}

const PLAN_TYPES = ["free", "basic", "professional", "enterprise"] as const

export default function SystemSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [usageLimits, setUsageLimits] = useState<Record<string, UsageLimit>>({})
  const [isAdmin, setIsAdmin] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    checkAdminAndFetch()
  }, [])

  const checkAdminAndFetch = async () => {
    try {
      // Check if user is admin
      const adminResponse = await fetch("/api/admin/check")
      if (!adminResponse.ok) {
        setIsAdmin(false)
        setLoading(false)
        return
      }

      const adminData = await adminResponse.json()
      if (!adminData.isAdmin) {
        setIsAdmin(false)
        setLoading(false)
        return
      }

      setIsAdmin(true)
      await fetchUsageLimits()
    } catch (error) {
      console.error("Error checking admin status:", error)
      setIsAdmin(false)
      setLoading(false)
    }
  }

  const fetchUsageLimits = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/usage-limits")
      
      if (!response.ok) {
        throw new Error("Failed to fetch usage limits")
      }

      const data = await response.json()
      const limitsMap: Record<string, UsageLimit> = {}
      
      // Initialize all plan types with defaults if not present
      PLAN_TYPES.forEach((planType) => {
        limitsMap[planType] = data.usageLimits?.find((limit: UsageLimit) => limit.plan_type === planType) || {
          plan_type: planType,
          monthly_content_limit: getDefaultLimit(planType, "monthly_content_limit"),
          max_content_length: getDefaultLimit(planType, "max_content_length"),
          sentiment_analysis_enabled: getDefaultFeature(planType, "sentiment_analysis"),
          keyword_extraction_enabled: getDefaultFeature(planType, "keyword_extraction"),
          text_summarization_enabled: getDefaultFeature(planType, "text_summarization"),
          api_access_enabled: getDefaultFeature(planType, "api_access"),
        }
      })

      setUsageLimits(limitsMap)
    } catch (error) {
      console.error("Error fetching usage limits:", error)
      toast({
        title: "Error",
        description: "Failed to load usage limits",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getDefaultLimit = (planType: string, limitType: string): number => {
    const defaults: Record<string, Record<string, number>> = {
      free: { monthly_content_limit: 5, max_content_length: 1000 },
      basic: { monthly_content_limit: 20, max_content_length: 3000 },
      professional: { monthly_content_limit: 100, max_content_length: 10000 },
      enterprise: { monthly_content_limit: -1, max_content_length: 50000 },
    }
    return defaults[planType]?.[limitType] || 0
  }

  const getDefaultFeature = (planType: string, feature: string): boolean => {
    const defaults: Record<string, Record<string, boolean>> = {
      free: {
        sentiment_analysis: false,
        keyword_extraction: false,
        text_summarization: false,
        api_access: false,
      },
      basic: {
        sentiment_analysis: true,
        keyword_extraction: true,
        text_summarization: false,
        api_access: false,
      },
      professional: {
        sentiment_analysis: true,
        keyword_extraction: true,
        text_summarization: true,
        api_access: true,
      },
      enterprise: {
        sentiment_analysis: true,
        keyword_extraction: true,
        text_summarization: true,
        api_access: true,
      },
    }
    return defaults[planType]?.[feature] || false
  }

  const handleUpdateLimit = (planType: string, field: keyof UsageLimit, value: any) => {
    setUsageLimits((prev) => ({
      ...prev,
      [planType]: {
        ...prev[planType],
        [field]: value,
      },
    }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await fetch("/api/admin/usage-limits", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          usageLimits: Object.values(usageLimits),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save usage limits")
      }

      toast({
        title: "Settings saved",
        description: "Usage limits have been updated successfully.",
      })

      await fetchUsageLimits()
    } catch (error) {
      console.error("Error saving usage limits:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save settings",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
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

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>You must be an administrator to access this page.</AlertDescription>
        </Alert>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">System Settings</h2>
            <p className="text-muted-foreground">Configure subscription plans and usage limits</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchUsageLimits} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="usage-limits" className="space-y-4">
          <TabsList className="bg-gray-900 border-gray-800">
            <TabsTrigger value="usage-limits">Usage Limits</TabsTrigger>
            <TabsTrigger value="plans">Subscription Plans</TabsTrigger>
          </TabsList>

          <TabsContent value="usage-limits" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {PLAN_TYPES.map((planType) => {
                const limit = usageLimits[planType]
                if (!limit) return null

                return (
                  <Card key={planType} className="bg-gray-900 border-gray-800">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="capitalize">{planType} Plan</CardTitle>
                        <Badge variant="outline" className="capitalize">
                          {planType}
                        </Badge>
                      </div>
                      <CardDescription>Configure usage limits for the {planType} subscription plan</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor={`${planType}-monthly-limit`}>Monthly Content Limit</Label>
                        <Input
                          id={`${planType}-monthly-limit`}
                          type="number"
                          value={limit.monthly_content_limit === -1 ? "" : limit.monthly_content_limit}
                          placeholder={limit.monthly_content_limit === -1 ? "Unlimited" : "0"}
                          onChange={(e) => {
                            const value = e.target.value === "" ? -1 : Number.parseInt(e.target.value) || 0
                            handleUpdateLimit(planType, "monthly_content_limit", value)
                          }}
                          className="bg-gray-800 border-gray-700"
                        />
                        <p className="text-xs text-muted-foreground">
                          Use -1 for unlimited. Current: {limit.monthly_content_limit === -1 ? "Unlimited" : limit.monthly_content_limit}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`${planType}-max-length`}>Max Content Length</Label>
                        <Input
                          id={`${planType}-max-length`}
                          type="number"
                          value={limit.max_content_length}
                          onChange={(e) => {
                            handleUpdateLimit(planType, "max_content_length", Number.parseInt(e.target.value) || 0)
                          }}
                          className="bg-gray-800 border-gray-700"
                        />
                        <p className="text-xs text-muted-foreground">Maximum characters per content piece</p>
                      </div>

                      <div className="space-y-3 pt-2 border-t border-gray-800">
                        <div className="flex items-center justify-between">
                          <Label htmlFor={`${planType}-sentiment`} className="cursor-pointer">
                            Sentiment Analysis
                          </Label>
                          <Switch
                            id={`${planType}-sentiment`}
                            checked={limit.sentiment_analysis_enabled}
                            onCheckedChange={(checked) => {
                              handleUpdateLimit(planType, "sentiment_analysis_enabled", checked)
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor={`${planType}-keyword`} className="cursor-pointer">
                            Keyword Extraction
                          </Label>
                          <Switch
                            id={`${planType}-keyword`}
                            checked={limit.keyword_extraction_enabled}
                            onCheckedChange={(checked) => {
                              handleUpdateLimit(planType, "keyword_extraction_enabled", checked)
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor={`${planType}-summarization`} className="cursor-pointer">
                            Text Summarization
                          </Label>
                          <Switch
                            id={`${planType}-summarization`}
                            checked={limit.text_summarization_enabled}
                            onCheckedChange={(checked) => {
                              handleUpdateLimit(planType, "text_summarization_enabled", checked)
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor={`${planType}-api`} className="cursor-pointer">
                            API Access
                          </Label>
                          <Switch
                            id={`${planType}-api`}
                            checked={limit.api_access_enabled}
                            onCheckedChange={(checked) => {
                              handleUpdateLimit(planType, "api_access_enabled", checked)
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="plans" className="space-y-4">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Subscription Plan Information</CardTitle>
                <CardDescription>View and manage subscription plan details</CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Plan Configuration</AlertTitle>
                  <AlertDescription>
                    Subscription plans are configured through the usage limits above. Plan pricing and PayPal integration
                    are managed separately. To modify plan pricing, update your PayPal subscription plans in the PayPal
                    dashboard.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

