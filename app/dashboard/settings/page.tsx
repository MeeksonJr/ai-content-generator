"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Loader2, Save, Plus, Trash2, Copy, Check } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"
import { useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { format } from "date-fns"

interface ApiKey {
  id: string
  key_name: string
  key_prefix: string
  is_active: boolean
  last_used_at: string | null
  created_at: string
  full_api_key?: string // Only present when first created
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loadingKeys, setLoadingKeys] = useState(false)
  const [creatingKey, setCreatingKey] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [newKeyDialogOpen, setNewKeyDialogOpen] = useState(false)
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    website: "",
    notifications: {
      email: true,
      marketing: false,
      social: true,
      security: true,
    },
  })
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          setUser(user)
          setFormData((prev) => ({
            ...prev,
            email: user.email || "",
            name: user.user_metadata?.name || "",
            company: user.user_metadata?.company || "",
            website: user.user_metadata?.website || "",
          }))
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
    fetchApiKeys()
  }, [supabase])

  const fetchApiKeys = async () => {
    setLoadingKeys(true)
    try {
      const response = await fetch("/api/api-keys")
      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated or no subscription
          setApiKeys([])
          return
        }
        throw new Error("Failed to fetch API keys")
      }
      const data = await response.json()
      setApiKeys(data.apiKeys || [])
    } catch (error) {
      console.error("Error fetching API keys:", error)
      toast({
        title: "Error",
        description: "Failed to load API keys",
        variant: "destructive",
      })
    } finally {
      setLoadingKeys(false)
    }
  }

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for your API key",
        variant: "destructive",
      })
      return
    }

    setCreatingKey(true)
    try {
      const response = await fetch("/api/api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ keyName: newKeyName.trim() }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create API key")
      }

      const data = await response.json()
      setNewlyCreatedKey(data.apiKey.full_api_key)
      setNewKeyName("")
      setNewKeyDialogOpen(false)
      await fetchApiKeys()

      toast({
        title: "API key created",
        description: "Your new API key has been created. Make sure to copy it now - you won't be able to see it again!",
      })
    } catch (error: any) {
      console.error("Error creating API key:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create API key",
        variant: "destructive",
      })
    } finally {
      setCreatingKey(false)
    }
  }

  const handleDeleteApiKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to delete this API key? This action cannot be undone.")) {
      return
    }

    try {
      const response = await fetch(`/api/api-keys?id=${keyId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete API key")
      }

      await fetchApiKeys()
      toast({
        title: "API key deleted",
        description: "The API key has been successfully deleted.",
      })
    } catch (error) {
      console.error("Error deleting API key:", error)
      toast({
        title: "Error",
        description: "Failed to delete API key",
        variant: "destructive",
      })
    }
  }

  const handleCopyKey = async (key: string, keyId: string) => {
    try {
      await navigator.clipboard.writeText(key)
      setCopiedKeyId(keyId)
      toast({
        title: "Copied",
        description: "API key copied to clipboard",
      })
      setTimeout(() => setCopiedKeyId(null), 2000)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy API key",
        variant: "destructive",
      })
    }
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          name: formData.name,
          company: formData.company,
          website: formData.website,
        },
      })

      if (error) throw error

      toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully.",
      })
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error updating profile",
        description: "Failed to update profile. Please try again.",
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="api">API</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal and company information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Your name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={formData.email} disabled placeholder="Your email" />
                  <p className="text-xs text-muted-foreground">
                    Your email address is associated with your account and cannot be changed.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData((prev) => ({ ...prev, company: e.target.value }))}
                    placeholder="Your company name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => setFormData((prev) => ({ ...prev, website: e.target.value }))}
                    placeholder="Your website URL"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSaveProfile} disabled={saving}>
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
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Configure how you receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-notifications">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications about your account activity via email
                      </p>
                    </div>
                    <Switch
                      id="email-notifications"
                      checked={formData.notifications.email}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({
                          ...prev,
                          notifications: { ...prev.notifications, email: checked },
                        }))
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="marketing-emails">Marketing Emails</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive emails about new features, promotions, and updates
                      </p>
                    </div>
                    <Switch
                      id="marketing-emails"
                      checked={formData.notifications.marketing}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({
                          ...prev,
                          notifications: { ...prev.notifications, marketing: checked },
                        }))
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="social-notifications">Social Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications when someone shares your content
                      </p>
                    </div>
                    <Switch
                      id="social-notifications"
                      checked={formData.notifications.social}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({
                          ...prev,
                          notifications: { ...prev.notifications, social: checked },
                        }))
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="security-notifications">Security Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications about security updates and login attempts
                      </p>
                    </div>
                    <Switch
                      id="security-notifications"
                      checked={formData.notifications.security}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({
                          ...prev,
                          notifications: { ...prev.notifications, security: checked },
                        }))
                      }
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={() => {
                    toast({
                      title: "Notification preferences saved",
                      description: "Your notification preferences have been updated.",
                    })
                  }}
                >
                  Save Preferences
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="api">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>API Access</CardTitle>
                    <CardDescription>Manage your API keys and access</CardDescription>
                  </div>
                  <Dialog open={newKeyDialogOpen} onOpenChange={setNewKeyDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Create API Key
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New API Key</DialogTitle>
                        <DialogDescription>
                          Give your API key a descriptive name to help you identify it later.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="key-name">Key Name</Label>
                          <Input
                            id="key-name"
                            placeholder="e.g., Production API, Development Key"
                            value={newKeyName}
                            onChange={(e) => setNewKeyName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !creatingKey) {
                                handleCreateApiKey()
                              }
                            }}
                          />
                        </div>
                        {newlyCreatedKey && (
                          <div className="space-y-2 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
                            <Label className="text-yellow-600 dark:text-yellow-400">
                              ⚠️ Important: Copy your API key now
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              You won't be able to see this key again. Make sure to copy it and store it securely.
                            </p>
                            <div className="flex items-center space-x-2">
                              <Input value={newlyCreatedKey} readOnly className="font-mono" />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCopyKey(newlyCreatedKey, "new")}
                              >
                                {copiedKeyId === "new" ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setNewKeyDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateApiKey} disabled={creatingKey || !newKeyName.trim()}>
                          {creatingKey ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            "Create Key"
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingKeys ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : apiKeys.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">No API keys found.</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Create your first API key to start using the API.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {apiKeys.map((key) => (
                      <div
                        key={key.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{key.key_name}</span>
                            {key.is_active ? (
                              <Badge variant="default">Active</Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="font-mono">{key.key_prefix}••••••••</span>
                            <span>Created {format(new Date(key.created_at), "MMM d, yyyy")}</span>
                            {key.last_used_at && (
                              <span>Last used {format(new Date(key.last_used_at), "MMM d, yyyy")}</span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteApiKey(key.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2 pt-4">
                  <Label>API Documentation</Label>
                  <p className="text-sm text-muted-foreground">
                    Learn how to integrate our AI content generation capabilities into your applications.
                  </p>
                  <Button variant="outline" className="mt-2" asChild>
                    <a href="/dashboard/api-docs" target="_blank" rel="noopener noreferrer">
                      View Documentation
                    </a>
                  </Button>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col items-start space-y-2">
                <p className="text-sm text-muted-foreground">
                  You can create up to 5 API keys. Each key can be used independently and revoked at any time.
                </p>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
