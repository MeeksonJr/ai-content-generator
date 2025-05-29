"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { Loader2, Copy, Check, Key, AlertCircle, Plus, Trash2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import Link from "next/link"

interface ApiKey {
  id: string
  key_name: string
  key_prefix: string
  is_active: boolean
  last_used_at: string | null
  created_at: string
  full_api_key?: string
}

export default function ApiDocsPage() {
  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState<any>(null)
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [copied, setCopied] = useState<string | null>(null)
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [creatingKey, setCreatingKey] = useState(false)
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)
  const [showFullKey, setShowFullKey] = useState<string | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch subscription data
      const subscriptionResponse = await fetch("/api/subscription")
      if (subscriptionResponse.ok) {
        const subscriptionData = await subscriptionResponse.json()
        setSubscription(subscriptionData.subscription)
      }

      // Fetch API keys
      const apiKeysResponse = await fetch("/api/api-keys")
      if (apiKeysResponse.ok) {
        const apiKeysData = await apiKeysResponse.json()
        setApiKeys(apiKeysData.apiKeys || [])
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "Failed to load API documentation data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCopyApiKey = (apiKey: string) => {
    navigator.clipboard.writeText(apiKey)
    setCopied(apiKey)
    setTimeout(() => setCopied(null), 2000)

    toast({
      title: "API key copied",
      description: "Your API key has been copied to your clipboard.",
    })
  }

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for your API key.",
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
        body: JSON.stringify({
          keyName: newKeyName.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create API key")
      }

      const data = await response.json()

      // Add the new key to the list
      setApiKeys([data.apiKey, ...apiKeys])
      setNewlyCreatedKey(data.apiKey.full_api_key)
      setNewKeyName("")
      setShowNewKeyDialog(false)

      toast({
        title: "API key created",
        description: "Your new API key has been created successfully. Make sure to copy it now!",
      })
    } catch (error) {
      console.error("Error creating API key:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create API key",
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
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete API key")
      }

      // Remove the key from the list
      setApiKeys(apiKeys.filter((key) => key.id !== keyId))

      toast({
        title: "API key deleted",
        description: "The API key has been deleted successfully.",
      })
    } catch (error) {
      console.error("Error deleting API key:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete API key",
        variant: "destructive",
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
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

  const hasApiAccess = subscription?.plan_type === "enterprise" && subscription?.status === "active"

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">API Documentation</h2>
          <p className="text-muted-foreground">Integrate AI content generation into your applications</p>
        </div>

        {!hasApiAccess && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>API Access Restricted</AlertTitle>
            <AlertDescription>
              API access is only available on the Enterprise plan.{" "}
              <Link href="/dashboard/subscription" className="underline font-medium">
                Upgrade your subscription
              </Link>{" "}
              to get API access.
            </AlertDescription>
          </Alert>
        )}

        {hasApiAccess && (
          <>
            {/* Newly created API key display */}
            {newlyCreatedKey && (
              <Alert className="border-green-200 bg-green-50">
                <Key className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">New API Key Created</AlertTitle>
                <AlertDescription className="text-green-700">
                  <p className="mb-2">Your new API key has been created. Copy it now as it won't be shown again:</p>
                  <div className="flex items-center space-x-2 bg-white p-2 rounded border">
                    <code className="flex-1 text-sm font-mono text-gray-900">{newlyCreatedKey}</code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyApiKey(newlyCreatedKey)}
                      className="border-green-300"
                    >
                      {copied === newlyCreatedKey ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setNewlyCreatedKey(null)}
                    className="mt-2 text-green-700 hover:text-green-800"
                  >
                    Dismiss
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* API Keys Management */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>API Keys</CardTitle>
                    <CardDescription>Manage your API keys for external integrations</CardDescription>
                  </div>
                  <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
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
                          <Label htmlFor="key-name">API Key Name</Label>
                          <Input
                            id="key-name"
                            value={newKeyName}
                            onChange={(e) => setNewKeyName(e.target.value)}
                            placeholder="e.g., Production App, Development, Mobile App"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewKeyDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateApiKey} disabled={creatingKey}>
                          {creatingKey ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            "Create API Key"
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {apiKeys.length > 0 ? (
                  <div className="space-y-4">
                    {apiKeys.map((apiKey) => (
                      <div key={apiKey.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{apiKey.key_name}</h4>
                            {apiKey.is_active ? (
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Active</span>
                            ) : (
                              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">Inactive</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span>
                              {showFullKey === apiKey.id ? (
                                <code className="bg-gray-100 px-2 py-1 rounded text-xs">{apiKey.key_prefix}...</code>
                              ) : (
                                <code className="bg-gray-100 px-2 py-1 rounded text-xs">{apiKey.key_prefix}...</code>
                              )}
                            </span>
                            <span>Created {formatDate(apiKey.created_at)}</span>
                            {apiKey.last_used_at && <span>Last used {formatDate(apiKey.last_used_at)}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteApiKey(apiKey.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No API keys yet</h3>
                    <p className="text-muted-foreground mb-4">Create your first API key to start using our API.</p>
                    <Button onClick={() => setShowNewKeyDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create API Key
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        <Tabs defaultValue="generate" className="space-y-4">
          <TabsList>
            <TabsTrigger value="generate">Generate Content</TabsTrigger>
            <TabsTrigger value="sentiment">Sentiment Analysis</TabsTrigger>
            <TabsTrigger value="keywords">Keyword Extraction</TabsTrigger>
            <TabsTrigger value="summarize">Text Summarization</TabsTrigger>
          </TabsList>

          <TabsContent value="generate">
            <Card>
              <CardHeader>
                <CardTitle>Generate Content API</CardTitle>
                <CardDescription>Create AI-generated content for various purposes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Endpoint</h3>
                  <p className="font-mono bg-muted p-2 rounded-md mt-1">POST /api/v1/generate</p>
                </div>

                <div>
                  <h3 className="text-lg font-medium">Headers</h3>
                  <div className="font-mono bg-muted p-2 rounded-md mt-1">
                    <p>Authorization: Bearer YOUR_API_KEY</p>
                    <p>Content-Type: application/json</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium">Request Body</h3>
                  <pre className="font-mono bg-muted p-2 rounded-md mt-1 overflow-auto">
                    {`{
  "contentType": "product_description", // or "blog_post", "social_media", "email"
  "title": "Wireless Bluetooth Headphones",
  "prompt": "High-quality noise-canceling headphones with 20-hour battery life"
}`}
                  </pre>
                </div>

                <div>
                  <h3 className="text-lg font-medium">Response</h3>
                  <pre className="font-mono bg-muted p-2 rounded-md mt-1 overflow-auto">
                    {`{
  "content": "Experience audio like never before with our Wireless Bluetooth Headphones...",
  "sentiment": "positive",
  "sentimentScore": 0.92,
  "keywords": [
    { "keyword": "wireless", "score": 0.85 },
    { "keyword": "bluetooth", "score": 0.82 },
    { "keyword": "headphones", "score": 0.95 }
  ]
}`}
                  </pre>
                </div>
              </CardContent>
              <CardFooter>
                <p className="text-sm text-muted-foreground">
                  Rate limit: 100 requests per day on the Enterprise plan.
                </p>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="sentiment">
            <Card>
              <CardHeader>
                <CardTitle>Sentiment Analysis API</CardTitle>
                <CardDescription>Analyze the sentiment of text content</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Endpoint</h3>
                  <p className="font-mono bg-muted p-2 rounded-md mt-1">POST /api/v1/sentiment</p>
                </div>

                <div>
                  <h3 className="text-lg font-medium">Headers</h3>
                  <div className="font-mono bg-muted p-2 rounded-md mt-1">
                    <p>Authorization: Bearer YOUR_API_KEY</p>
                    <p>Content-Type: application/json</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium">Request Body</h3>
                  <pre className="font-mono bg-muted p-2 rounded-md mt-1 overflow-auto">
                    {`{
  "text": "I absolutely love this product! It's amazing and works perfectly."
}`}
                  </pre>
                </div>

                <div>
                  <h3 className="text-lg font-medium">Response</h3>
                  <pre className="font-mono bg-muted p-2 rounded-md mt-1 overflow-auto">
                    {`{
  "sentiment": "positive",
  "score": 0.95
}`}
                  </pre>
                </div>
              </CardContent>
              <CardFooter>
                <p className="text-sm text-muted-foreground">
                  Rate limit: 200 requests per day on the Enterprise plan.
                </p>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="keywords">
            <Card>
              <CardHeader>
                <CardTitle>Keyword Extraction API</CardTitle>
                <CardDescription>Extract keywords from text content</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Endpoint</h3>
                  <p className="font-mono bg-muted p-2 rounded-md mt-1">POST /api/v1/keywords</p>
                </div>

                <div>
                  <h3 className="text-lg font-medium">Headers</h3>
                  <div className="font-mono bg-muted p-2 rounded-md mt-1">
                    <p>Authorization: Bearer YOUR_API_KEY</p>
                    <p>Content-Type: application/json</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium">Request Body</h3>
                  <pre className="font-mono bg-muted p-2 rounded-md mt-1 overflow-auto">
                    {`{
  "text": "Artificial intelligence is transforming digital marketing strategies for e-commerce businesses."
}`}
                  </pre>
                </div>

                <div>
                  <h3 className="text-lg font-medium">Response</h3>
                  <pre className="font-mono bg-muted p-2 rounded-md mt-1 overflow-auto">
                    {`{
  "keywords": [
    { "keyword": "artificial intelligence", "score": 0.92 },
    { "keyword": "digital marketing", "score": 0.87 },
    { "keyword": "e-commerce", "score": 0.85 },
    { "keyword": "strategies", "score": 0.76 }
  ]
}`}
                  </pre>
                </div>
              </CardContent>
              <CardFooter>
                <p className="text-sm text-muted-foreground">
                  Rate limit: 200 requests per day on the Enterprise plan.
                </p>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="summarize">
            <Card>
              <CardHeader>
                <CardTitle>Text Summarization API</CardTitle>
                <CardDescription>Generate concise summaries of longer text</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Endpoint</h3>
                  <p className="font-mono bg-muted p-2 rounded-md mt-1">POST /api/v1/summarize</p>
                </div>

                <div>
                  <h3 className="text-lg font-medium">Headers</h3>
                  <div className="font-mono bg-muted p-2 rounded-md mt-1">
                    <p>Authorization: Bearer YOUR_API_KEY</p>
                    <p>Content-Type: application/json</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium">Request Body</h3>
                  <pre className="font-mono bg-muted p-2 rounded-md mt-1 overflow-auto">
                    {`{
  "text": "Lorem ipsum dolor sit amet, consectetur adipiscing elit...",
  "maxLength": 150
}`}
                  </pre>
                </div>

                <div>
                  <h3 className="text-lg font-medium">Response</h3>
                  <pre className="font-mono bg-muted p-2 rounded-md mt-1 overflow-auto">
                    {`{
  "summary": "A concise summary of the provided text..."
}`}
                  </pre>
                </div>
              </CardContent>
              <CardFooter>
                <p className="text-sm text-muted-foreground">
                  Rate limit: 100 requests per day on the Enterprise plan.
                </p>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle>Code Examples</CardTitle>
            <CardDescription>How to use our API in different programming languages</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="javascript" className="space-y-4">
              <TabsList>
                <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                <TabsTrigger value="python">Python</TabsTrigger>
                <TabsTrigger value="curl">cURL</TabsTrigger>
              </TabsList>

              <TabsContent value="javascript">
                <pre className="font-mono bg-muted p-4 rounded-md overflow-auto">
                  {`// Using fetch API
async function generateContent() {
  const response = await fetch('${process.env.NEXT_PUBLIC_APP_URL}/api/v1/generate', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contentType: 'product_description',
      title: 'Wireless Bluetooth Headphones',
      prompt: 'High-quality noise-canceling headphones with 20-hour battery life'
    })
  });

  const data = await response.json();
  console.log(data.content);
}`}
                </pre>
              </TabsContent>

              <TabsContent value="python">
                <pre className="font-mono bg-muted p-4 rounded-md overflow-auto">
                  {`# Using requests library
import requests
import json

def generate_content():
    url = "${process.env.NEXT_PUBLIC_APP_URL}/api/v1/generate"
    headers = {
        "Authorization": "Bearer YOUR_API_KEY",
        "Content-Type": "application/json"
    }
    payload = {
        "contentType": "product_description",
        "title": "Wireless Bluetooth Headphones",
        "prompt": "High-quality noise-canceling headphones with 20-hour battery life"
    }
    
    response = requests.post(url, headers=headers, data=json.dumps(payload))
    data = response.json()
    print(data["content"])

generate_content()`}
                </pre>
              </TabsContent>

              <TabsContent value="curl">
                <pre className="font-mono bg-muted p-4 rounded-md overflow-auto">
                  {`curl -X POST \\
  ${process.env.NEXT_PUBLIC_APP_URL}/api/v1/generate \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "contentType": "product_description",
    "title": "Wireless Bluetooth Headphones",
    "prompt": "High-quality noise-canceling headphones with 20-hour battery life"
  }'`}
                </pre>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
