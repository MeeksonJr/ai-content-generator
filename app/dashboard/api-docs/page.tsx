"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"
import { Loader2, Copy, Check, Key, AlertCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"

export default function ApiDocsPage() {
  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState<any>(null)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchSubscriptionData()
  }, [])

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/subscription")

      if (!response.ok) {
        throw new Error("Failed to fetch subscription data")
      }

      const data = await response.json()
      setSubscription(data.subscription)

      // Fetch API key if subscription has API access
      if (data.subscription && data.usageLimits?.api_access_enabled) {
        const { data: userData } = await supabase.auth.getUser()
        if (userData.user) {
          // In a real app, you would fetch the API key from a secure endpoint
          // This is just a placeholder
          setApiKey(`sk_${userData.user.id.substring(0, 8)}_${Math.random().toString(36).substring(2, 10)}`)
        }
      }
    } catch (error) {
      console.error("Error fetching subscription data:", error)
      toast({
        title: "Error",
        description: "Failed to load subscription information",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCopyApiKey = () => {
    if (!apiKey) return

    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)

    toast({
      title: "API key copied",
      description: "Your API key has been copied to your clipboard.",
    })
  }

  const handleRegenerateApiKey = () => {
    // In a real app, you would call an API to regenerate the key
    const newApiKey = `sk_${Math.random().toString(36).substring(2, 10)}_${Math.random().toString(36).substring(2, 10)}`
    setApiKey(newApiKey)

    toast({
      title: "API key regenerated",
      description: "Your API key has been regenerated. The old key is no longer valid.",
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
          <Card>
            <CardHeader>
              <CardTitle>Your API Key</CardTitle>
              <CardDescription>Use this key to authenticate your API requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="bg-muted p-2 rounded-md flex-1 font-mono text-sm overflow-hidden">
                  {apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` : "Loading..."}
                </div>
                <Button variant="outline" size="sm" onClick={handleCopyApiKey} disabled={!apiKey}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="sm" onClick={handleRegenerateApiKey} disabled={!apiKey}>
                  <Key className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Keep your API key secure. Do not share it in publicly accessible areas.
              </p>
            </CardContent>
          </Card>
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
  const response = await fetch('https://api.aicontentgenerator.com/v1/generate', {
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
    url = "https://api.aicontentgenerator.com/v1/generate"
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
  https://api.aicontentgenerator.com/v1/generate \\
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
