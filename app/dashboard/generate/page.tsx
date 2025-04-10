"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, Save, Copy, Trash2, FileText, MessageSquare, Tag, AlertTriangle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"

export default function GeneratePage() {
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [title, setTitle] = useState("")
  const [contentType, setContentType] = useState("product-description")
  const [prompt, setPrompt] = useState("")
  const [generatedContent, setGeneratedContent] = useState("")
  const [sentiment, setSentiment] = useState<string | null>(null)
  const [keywords, setKeywords] = useState<string[]>([])
  const [temperature, setTemperature] = useState(0.7)
  const [maxLength, setMaxLength] = useState(500)
  const [enableKeywordExtraction, setEnableKeywordExtraction] = useState(false)
  const [enableSentimentAnalysis, setEnableSentimentAnalysis] = useState(false)
  const [savedContent, setSavedContent] = useState<any[]>([])
  const [loadingSaved, setLoadingSaved] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [usingFallback, setUsingFallback] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchSavedContent()
  }, [])

  const fetchSavedContent = async () => {
    try {
      setLoadingSaved(true)

      // Get the current user
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setSavedContent([])
        return
      }

      const { data, error } = await supabase
        .from("content")
        .select("*")
        .eq("user_id", user.id) // Only fetch content for the current user
        .order("created_at", { ascending: false })
        .limit(10)

      if (error) {
        throw error
      }

      setSavedContent(data || [])
    } catch (error) {
      console.error("Error fetching saved content:", error)
      toast({
        title: "Error",
        description: "Failed to load saved content",
        variant: "destructive",
      })
    } finally {
      setLoadingSaved(false)
    }
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      setGeneratedContent("")
      setSentiment(null)
      setKeywords([])
      setUsingFallback(false)

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          title,
          contentType,
          temperature,
          maxLength,
        }),
      })

      // Check if response is OK
      if (!response.ok) {
        let errorMessage = "Failed to generate content"

        try {
          // Try to parse error as JSON
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (parseError) {
          // If parsing fails, use the status text
          errorMessage = `Server error: ${response.status} ${response.statusText}`
        }

        throw new Error(errorMessage)
      }

      // Parse the JSON response
      let data
      try {
        data = await response.json()
      } catch (error) {
        console.error("Error parsing JSON response:", error)
        throw new Error("Invalid response from server. Please try again later.")
      }

      setGeneratedContent(data.content)

      // Check if fallback was used
      if (data.fallback) {
        setUsingFallback(true)
        toast({
          title: "Service Notice",
          description: "AI service is experiencing high demand. Using basic content template.",
          variant: "default",
        })
      }

      if (!title && data.content) {
        // Generate a title based on the content
        setTitle(
          data.content
            .split("\n")[0]
            .replace(/^#\s*/, "") // Remove Markdown heading
            .substring(0, 50)
            .replace(/[^\w\s]/gi, "")
            .trim(),
        )
      }

      // Set sentiment and keywords if available
      if (data.sentiment) {
        setSentiment(data.sentiment)
      }

      if (data.keywords && Array.isArray(data.keywords)) {
        // Check if keywords are objects with a 'keyword' property
        if (data.keywords.length > 0 && typeof data.keywords[0] === "object" && "keyword" in data.keywords[0]) {
          setKeywords(data.keywords.map((item: any) => item.keyword))
        } else {
          setKeywords(data.keywords)
        }
      }
    } catch (error) {
      console.error("Error generating content:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate content",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!generatedContent.trim()) {
      toast({
        title: "Error",
        description: "Please generate content first",
        variant: "destructive",
      })
      return
    }

    try {
      setAnalyzing(true)

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: generatedContent,
          analyzeSentiment: enableSentimentAnalysis,
          extractKeywords: enableKeywordExtraction,
        }),
      })

      // Check if response is OK
      if (!response.ok) {
        let errorMessage = "Failed to analyze content"

        try {
          // Try to parse error as JSON
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (parseError) {
          // If parsing fails, use the status text
          errorMessage = `Server error: ${response.status} ${response.statusText}`
        }

        throw new Error(errorMessage)
      }

      // Parse the JSON response
      let data
      try {
        data = await response.json()
      } catch (error) {
        console.error("Error parsing JSON response:", error)

        // Implement fallback analysis
        data = {}

        if (enableSentimentAnalysis) {
          // Simple fallback sentiment analysis
          const text = generatedContent.toLowerCase()
          const positiveWords = ["good", "great", "excellent", "amazing", "wonderful", "best", "love", "happy"]
          const negativeWords = ["bad", "worst", "terrible", "awful", "poor", "hate", "sad", "disappointed"]

          let positiveCount = 0
          let negativeCount = 0

          positiveWords.forEach((word) => {
            const regex = new RegExp(`\\b${word}\\b`, "g")
            const matches = text.match(regex)
            if (matches) positiveCount += matches.length
          })

          negativeWords.forEach((word) => {
            const regex = new RegExp(`\\b${word}\\b`, "g")
            const matches = text.match(regex)
            if (matches) negativeCount += matches.length
          })

          if (positiveCount > negativeCount) {
            data.sentiment = "positive"
          } else if (negativeCount > positiveCount) {
            data.sentiment = "negative"
          } else {
            data.sentiment = "neutral"
          }
        }

        if (enableKeywordExtraction) {
          // Simple fallback keyword extraction
          const words = generatedContent
            .toLowerCase()
            .replace(/[^\w\s]/g, "")
            .split(/\s+/)
            .filter((word) => word.length > 3)

          const stopWords = [
            "this",
            "that",
            "these",
            "those",
            "with",
            "from",
            "have",
            "will",
            "would",
            "could",
            "should",
            "their",
            "there",
            "about",
            "which",
          ]
          const filteredWords = words.filter((word) => !stopWords.includes(word))

          const wordCounts: Record<string, number> = {}
          filteredWords.forEach((word) => {
            wordCounts[word] = (wordCounts[word] || 0) + 1
          })

          data.keywords = Object.entries(wordCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([word]) => word)
        }

        // Set fallback flag
        data.fallback = true

        toast({
          title: "Service Notice",
          description: "Analysis service is experiencing issues. Using basic analysis.",
          variant: "default",
        })
      }

      if (data.sentiment) {
        setSentiment(data.sentiment)
      }

      if (data.keywords) {
        // Check if keywords are objects with a 'keyword' property
        if (data.keywords.length > 0 && typeof data.keywords[0] === "object" && "keyword" in data.keywords[0]) {
          setKeywords(data.keywords.map((item: any) => item.keyword))
        } else {
          setKeywords(data.keywords)
        }
      }

      // Check if fallback was used
      if (data.fallback) {
        toast({
          title: "Analysis Complete",
          description: "Content has been analyzed using fallback methods due to service issues.",
          variant: "default",
        })
      } else {
        toast({
          title: "Analysis Complete",
          description: "Content has been analyzed successfully",
        })
      }
    } catch (error) {
      console.error("Error analyzing content:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to analyze content",
        variant: "destructive",
      })

      // Reset analysis state
      if (enableSentimentAnalysis) {
        setSentiment(null)
      }
      if (enableKeywordExtraction) {
        setKeywords([])
      }
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSave = async () => {
    if (!generatedContent.trim() || !title.trim()) {
      toast({
        title: "Error",
        description: "Please generate content and provide a title",
        variant: "destructive",
      })
      return
    }

    try {
      // Get the current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error("You must be logged in to save content")
      }

      const { data, error } = await supabase
        .from("content")
        .insert({
          title,
          content_type: contentType,
          content: generatedContent,
          sentiment: sentiment,
          keywords: keywords.length > 0 ? keywords : null,
          user_id: user.id, // Add the user_id from the authenticated user
        })
        .select()

      if (error) {
        throw error
      }

      toast({
        title: "Content Saved",
        description: "Your content has been saved successfully",
      })

      // Refresh the saved content list
      fetchSavedContent()

      // Optionally navigate to the content detail page
      if (data && data.length > 0) {
        router.push(`/dashboard/content/${data[0].id}`)
      }
    } catch (error) {
      console.error("Error saving content:", error)
      toast({
        title: "Error",
        description: "Failed to save content",
        variant: "destructive",
      })
    }
  }

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent)
    toast({
      title: "Copied",
      description: "Content copied to clipboard",
    })
  }

  const handleDeleteContent = async (id: string) => {
    try {
      setDeletingId(id)
      const { error } = await supabase.from("content").delete().eq("id", id)

      if (error) {
        throw error
      }

      toast({
        title: "Content Deleted",
        description: "Your content has been deleted successfully",
      })

      // Refresh the saved content list
      fetchSavedContent()
    } catch (error) {
      console.error("Error deleting content:", error)
      toast({
        title: "Error",
        description: "Failed to delete content",
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  const handleViewContent = (id: string) => {
    router.push(`/dashboard/content/${id}`)
  }

  const contentTypeOptions = [
    { value: "product-description", label: "Product Description" },
    { value: "blog-post", label: "Blog Post" },
    { value: "social-media", label: "Social Media Post" },
    { value: "email", label: "Email" },
    { value: "ad-copy", label: "Ad Copy" },
  ]

  const resetForm = () => {
    setTitle("")
    setPrompt("")
    setGeneratedContent("")
    setSentiment(null)
    setKeywords([])
    setContentType("product-description")
    setTemperature(0.7)
    setMaxLength(500)
    setUsingFallback(false)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Content Generator</h2>
          <p className="text-muted-foreground">Generate high-quality content using AI</p>
        </div>

        <Tabs defaultValue="generate" className="space-y-4">
          <TabsList className="bg-gray-900 border-gray-800">
            <TabsTrigger value="generate">Generate Content</TabsTrigger>
            <TabsTrigger value="saved">Saved Content</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-4">
            {usingFallback && (
              <Alert variant="warning" className="bg-yellow-900/20 border-yellow-800">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>AI Service Notice</AlertTitle>
                <AlertDescription>
                  Our AI service is currently experiencing high demand. We've provided a basic template. For best
                  results, please try again later.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle>Input</CardTitle>
                  <CardDescription>Enter your content details and preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      placeholder="Enter a title for your content"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content-type">Content Type</Label>
                    <Select value={contentType} onValueChange={setContentType}>
                      <SelectTrigger id="content-type" className="bg-gray-800 border-gray-700">
                        <SelectValue placeholder="Select content type" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        {contentTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prompt">Prompt</Label>
                    <Textarea
                      id="prompt"
                      placeholder="Describe what you want to generate..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={5}
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="temperature">Creativity (Temperature): {temperature}</Label>
                    </div>
                    <Slider
                      id="temperature"
                      min={0}
                      max={1}
                      step={0.1}
                      value={[temperature]}
                      onValueChange={(value) => setTemperature(value[0])}
                      className="bg-gray-800"
                    />
                    <p className="text-xs text-muted-foreground">
                      Lower values produce more predictable text, higher values produce more creative text.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="max-length">Maximum Length: {maxLength}</Label>
                    </div>
                    <Slider
                      id="max-length"
                      min={100}
                      max={2000}
                      step={100}
                      value={[maxLength]}
                      onValueChange={(value) => setMaxLength(value[0])}
                      className="bg-gray-800"
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="keyword-extraction"
                        checked={enableKeywordExtraction}
                        onCheckedChange={setEnableKeywordExtraction}
                      />
                      <Label htmlFor="keyword-extraction">Enable Keyword Extraction</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="sentiment-analysis"
                        checked={enableSentimentAnalysis}
                        onCheckedChange={setEnableSentimentAnalysis}
                      />
                      <Label htmlFor="sentiment-analysis">Enable Sentiment Analysis</Label>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" className="border-gray-700 hover:bg-gray-800" onClick={resetForm}>
                    Reset
                  </Button>
                  <Button onClick={handleGenerate} disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Generate Content"
                    )}
                  </Button>
                </CardFooter>
              </Card>

              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle>Output</CardTitle>
                  <CardDescription>Your generated content will appear here</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="min-h-[300px] rounded-md border border-gray-700 bg-gray-800 p-4 overflow-auto">
                    {loading ? (
                      <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : generatedContent ? (
                      <div className="whitespace-pre-wrap">{generatedContent}</div>
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        Generated content will appear here
                      </div>
                    )}
                  </div>

                  {generatedContent && (
                    <div className="space-y-4">
                      {sentiment && (
                        <div className="flex items-center space-x-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Sentiment:</span>
                          <Badge
                            variant="outline"
                            className={
                              sentiment === "positive"
                                ? "bg-green-900/20 text-green-400 border-green-800"
                                : sentiment === "negative"
                                  ? "bg-red-900/20 text-red-400 border-red-800"
                                  : "bg-yellow-900/20 text-yellow-400 border-yellow-800"
                            }
                          >
                            {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
                          </Badge>
                        </div>
                      )}

                      {keywords.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Tag className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Keywords:</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {keywords.map((keyword, index) => (
                              <Badge key={index} variant="outline" className="bg-gray-800 border-gray-700">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyToClipboard}
                      disabled={!generatedContent}
                      className="border-gray-700 hover:bg-gray-800"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleSave}
                      disabled={!generatedContent}
                      className="border-gray-700 hover:bg-gray-800"
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    onClick={handleAnalyze}
                    disabled={analyzing || !generatedContent || (!enableKeywordExtraction && !enableSentimentAnalysis)}
                    variant="secondary"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      "Analyze Content"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="saved" className="space-y-4">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Saved Content</CardTitle>
                <CardDescription>View and manage your saved content</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSaved ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : savedContent.length > 0 ? (
                  <div className="space-y-4">
                    {savedContent.map((content) => (
                      <Card
                        key={content.id}
                        className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors"
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div
                              className="space-y-2 flex-1 cursor-pointer"
                              onClick={() => handleViewContent(content.id)}
                            >
                              <h3 className="font-medium">{content.title}</h3>
                              <div className="flex items-center space-x-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {content.content_type
                                    .split("-")
                                    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                                    .join(" ")}
                                </span>
                                {content.sentiment && (
                                  <Badge
                                    variant="outline"
                                    className={
                                      content.sentiment === "positive"
                                        ? "bg-green-900/20 text-green-400 border-green-800"
                                        : content.sentiment === "negative"
                                          ? "bg-red-900/20 text-red-400 border-red-800"
                                          : "bg-yellow-900/20 text-yellow-400 border-yellow-800"
                                    }
                                  >
                                    {content.sentiment.charAt(0).toUpperCase() + content.sentiment.slice(1)}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">{content.content}</p>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewContent(content.id)}
                                className="h-8 w-8"
                                title="View Content"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteContent(content.id)}
                                className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                disabled={deletingId === content.id}
                                title="Delete Content"
                              >
                                {deletingId === content.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                          {content.keywords && Array.isArray(content.keywords) && content.keywords.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1">
                              {content.keywords.slice(0, 5).map((keyword: any, index: number) => {
                                // Check if keyword is an object with a 'keyword' property
                                const keywordText =
                                  typeof keyword === "object" && keyword !== null && "keyword" in keyword
                                    ? keyword.keyword
                                    : keyword

                                return (
                                  <Badge key={index} variant="outline" className="text-xs bg-gray-900 border-gray-700">
                                    {keywordText}
                                  </Badge>
                                )
                              })}
                              {content.keywords.length > 5 && (
                                <Badge variant="outline" className="text-xs bg-gray-900 border-gray-700">
                                  +{content.keywords.length - 5} more
                                </Badge>
                              )}
                            </div>
                          )}
                          <div className="mt-2 text-xs text-muted-foreground">
                            {new Date(content.created_at).toLocaleDateString()}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No saved content</h3>
                    <p className="text-muted-foreground mt-1">Generate and save content to see it here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
