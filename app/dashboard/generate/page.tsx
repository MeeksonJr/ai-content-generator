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
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Loader2,
  Save,
  Copy,
  Trash2,
  FileText,
  MessageSquare,
  Tag,
  AlertTriangle,
  ImageIcon,
  Download,
  Sparkles,
  Wand2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

export default function GeneratePage() {
  // Content Generation State
  const [contentLoading, setContentLoading] = useState(false)
  const [title, setTitle] = useState("")
  const [contentType, setContentType] = useState("product-description")
  const [prompt, setPrompt] = useState("")
  const [generatedContent, setGeneratedContent] = useState("")
  const [sentiment, setSentiment] = useState<string | null>(null)
  const [keywords, setKeywords] = useState<string[]>([])
  const [temperature, setTemperature] = useState(0.7)
  const [maxLength, setMaxLength] = useState(1000)
  const [usingFallback, setUsingFallback] = useState(false)

  // Image Generation State
  const [imageLoading, setImageLoading] = useState(false)
  const [imagePrompt, setImagePrompt] = useState("")
  const [generatedImage, setGeneratedImage] = useState("")
  const [imageWidth, setImageWidth] = useState(1024)
  const [imageHeight, setImageHeight] = useState(1024)
  const [guidanceScale, setGuidanceScale] = useState(3.5)
  const [inferenceSteps, setInferenceSteps] = useState(50)

  // Saved Content State
  const [savedContent, setSavedContent] = useState<any[]>([])
  const [loadingSaved, setLoadingSaved] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchSavedContent()
  }, [])

  const fetchSavedContent = async () => {
    try {
      setLoadingSaved(true)

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
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20)

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

  const handleGenerateContent = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt",
        variant: "destructive",
      })
      return
    }

    try {
      setContentLoading(true)
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

      const responseContentType = response.headers.get("content-type")

      if (!response.ok) {
        let errorMessage = "Failed to generate content"
        let errorDetails = ""

        try {
          const errorText = await response.text()

          if (responseContentType && responseContentType.includes("application/json")) {
            try {
              const errorData = JSON.parse(errorText)
              errorMessage = errorData.error || errorMessage
              errorDetails = JSON.stringify(errorData)
            } catch (jsonError) {
              errorMessage = "Failed to parse JSON error response"
              errorDetails = `Original error text: ${errorText.substring(0, 200)}...`
            }
          } else if (responseContentType && responseContentType.includes("text/html")) {
            errorMessage = "Server returned an HTML error page"
            errorDetails = errorText.substring(0, 500) + "..."
          } else {
            errorMessage = `Server error: ${response.status} ${response.statusText}`
            errorDetails = errorText.substring(0, 500) + "..."
          }
        } catch (textError) {
          errorMessage = "Failed to read error response"
          errorDetails = textError instanceof Error ? textError.message : "Unknown text error"
        }

        console.error("API Error:", errorMessage, errorDetails)
        throw new Error(errorMessage)
      }

      const responseText = await response.text()
      let data

      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error("JSON parsing failed:", parseError)
        console.error("Response was:", responseText.substring(0, 1000))
        throw new Error("Server returned invalid JSON response. Please try again.")
      }

      setGeneratedContent(data.content)

      if (data.fallback) {
        setUsingFallback(true)
        toast({
          title: "Service Notice",
          description: "AI service is experiencing high demand. Using basic content template.",
          variant: "default",
        })
      }

      if (!title && data.content) {
        setTitle(
          data.content
            .split("\n")[0]
            .replace(/^#\s*/, "")
            .substring(0, 50)
            .replace(/[^\w\s]/gi, "")
            .trim(),
        )
      }

      if (data.sentiment) {
        setSentiment(data.sentiment)
      }

      if (data.keywords && Array.isArray(data.keywords)) {
        setKeywords(data.keywords)
      }

      toast({
        title: "Content Generated",
        description: "Your content has been generated successfully!",
      })
    } catch (error) {
      console.error("Error generating content:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate content",
        variant: "destructive",
      })
    } finally {
      setContentLoading(false)
    }
  }

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter an image prompt",
        variant: "destructive",
      })
      return
    }

    try {
      setImageLoading(true)

      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: imagePrompt,
          width: imageWidth,
          height: imageHeight,
          guidance_scale: guidanceScale,
          num_inference_steps: inferenceSteps,
        }),
      })

      if (!response.ok) {
        let errorMessage = "Failed to generate image"
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = `Server error: ${response.status} ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      setGeneratedImage(data.image)

      toast({
        title: "Image Generated",
        description: "Your image has been generated successfully!",
      })
    } catch (error) {
      console.error("Error generating image:", error)
      toast({
        title: "Image Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate image",
        variant: "destructive",
      })
    } finally {
      setImageLoading(false)
    }
  }

  const handleSaveImage = async () => {
    if (!generatedImage.trim()) {
      toast({
        title: "Error",
        description: "Please generate an image first",
        variant: "destructive",
      })
      return
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error("You must be logged in to save images")
      }

      // Instead of saving the full base64 image, save a reference
      const imageTitle = imagePrompt.substring(0, 50) || "Generated Image"
      const imageDescription = `Generated image: ${imagePrompt}`

      const { data, error } = await supabase
        .from("content")
        .insert({
          title: imageTitle,
          content_type: "image",
          content: imageDescription,
          image_url: "generated", // Mark as generated image
          image_prompt: imagePrompt,
          content_category: "image",
          user_id: user.id,
        })
        .select()

      if (error) {
        throw error
      }

      toast({
        title: "Image Saved",
        description: "Your image reference has been saved successfully",
      })

      fetchSavedContent()
    } catch (error) {
      console.error("Error saving image:", error)
      toast({
        title: "Error",
        description: "Failed to save image reference",
        variant: "destructive",
      })
    }
  }

  const handleSaveContent = async () => {
    if (!generatedContent.trim()) {
      toast({
        title: "Error",
        description: "Please generate content first",
        variant: "destructive",
      })
      return
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error("You must be logged in to save content")
      }

      // For images, save only a reference to avoid database size limits
      const imageRef = generatedImage ? "generated" : null
      const imagePromptRef = generatedImage ? imagePrompt : null

      const { data, error } = await supabase
        .from("content")
        .insert({
          title: title || "Untitled",
          content_type: contentType,
          content: generatedContent,
          sentiment: sentiment,
          keywords: keywords.length > 0 ? keywords : null,
          image_url: imageRef,
          image_prompt: imagePromptRef,
          content_category: getCategoryFromType(contentType),
          user_id: user.id,
        })
        .select()

      if (error) {
        throw error
      }

      toast({
        title: "Content Saved",
        description: "Your content has been saved successfully",
      })

      fetchSavedContent()

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

  const getCategoryFromType = (type: string): string => {
    switch (type) {
      case "product-description":
        return "product"
      case "blog-post":
        return "blog"
      case "social-media":
        return "social"
      case "email":
        return "email"
      default:
        return "general"
    }
  }

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: "Content copied to clipboard",
    })
  }

  const handleDownloadImage = () => {
    if (!generatedImage) return

    const link = document.createElement("a")
    link.href = generatedImage
    link.download = `generated-image-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    const url = generatedImage
    URL.revokeObjectURL(url)
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

  const contentTypeOptions = [
    { value: "product-description", label: "Product Description" },
    { value: "blog-post", label: "Blog Post" },
    { value: "social-media", label: "Social Media Post" },
    { value: "email", label: "Email Template" },
    { value: "ad-copy", label: "Ad Copy" },
    { value: "press-release", label: "Press Release" },
  ]

  const resetContentForm = () => {
    setTitle("")
    setPrompt("")
    setGeneratedContent("")
    setSentiment(null)
    setKeywords([])
    setContentType("product-description")
    setTemperature(0.7)
    setMaxLength(1000)
    setUsingFallback(false)
  }

  const resetImageForm = () => {
    setImagePrompt("")
    setGeneratedImage("")
    setImageWidth(1024)
    setImageHeight(1024)
    setGuidanceScale(3.5)
    setInferenceSteps(50)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">AI Content Studio</h2>
          <p className="text-muted-foreground">Generate high-quality content and images using AI</p>
        </div>

        <Tabs defaultValue="content" className="space-y-4">
          <TabsList className="bg-gray-900 border-gray-800">
            <TabsTrigger value="content" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Generate Content
            </TabsTrigger>
            <TabsTrigger value="image" className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Generate Image
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Saved Content
            </TabsTrigger>
          </TabsList>

          {/* Content Generation Tab */}
          <TabsContent value="content" className="space-y-4">
            {usingFallback && (
              <Alert variant="default" className="bg-yellow-900/20 border-yellow-800">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>AI Service Notice</AlertTitle>
                <AlertDescription>
                  Our AI service is currently experiencing high demand. We've provided a basic template. For best
                  results, please try again later.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Content Input */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Content Settings
                  </CardTitle>
                  <CardDescription>Configure your content generation preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title (Optional)</Label>
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
                    <Label htmlFor="prompt">Content Prompt</Label>
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
                    <Label>Creativity (Temperature): {temperature}</Label>
                    <Slider
                      value={[temperature]}
                      onValueChange={(value) => setTemperature(value[0])}
                      max={1}
                      min={0}
                      step={0.1}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Lower values produce more predictable text, higher values produce more creative text.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Maximum Length: {maxLength} tokens</Label>
                    <Slider
                      value={[maxLength]}
                      onValueChange={(value) => setMaxLength(value[0])}
                      max={4000}
                      min={100}
                      step={100}
                      className="w-full"
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" className="border-gray-700 hover:bg-gray-800" onClick={resetContentForm}>
                    Reset
                  </Button>
                  <Button onClick={handleGenerateContent} disabled={contentLoading}>
                    {contentLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Content
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>

              {/* Content Output */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Generated Content</CardTitle>
                    {generatedContent && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleCopyToClipboard(generatedContent)}
                          size="sm"
                          variant="outline"
                          className="border-gray-700"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button onClick={handleSaveContent} size="sm">
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="min-h-[400px] rounded-md border border-gray-700 bg-gray-800 p-4 overflow-auto">
                    {contentLoading ? (
                      <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : generatedContent ? (
                      <div className="whitespace-pre-wrap text-sm">{generatedContent}</div>
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
                                {typeof keyword === "string" ? keyword : keyword.keyword || keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Image Generation Tab */}
          <TabsContent value="image" className="space-y-4">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Image Input */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wand2 className="h-5 w-5" />
                    Image Settings
                  </CardTitle>
                  <CardDescription>Configure your image generation preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="image-prompt">Image Prompt</Label>
                    <Textarea
                      id="image-prompt"
                      placeholder="Describe the image you want to generate..."
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      rows={4}
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Width: {imageWidth}px</Label>
                      <Slider
                        value={[imageWidth]}
                        onValueChange={(value) => setImageWidth(value[0])}
                        max={1536}
                        min={512}
                        step={64}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Height: {imageHeight}px</Label>
                      <Slider
                        value={[imageHeight]}
                        onValueChange={(value) => setImageHeight(value[0])}
                        max={1536}
                        min={512}
                        step={64}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Guidance Scale: {guidanceScale}</Label>
                    <Slider
                      value={[guidanceScale]}
                      onValueChange={(value) => setGuidanceScale(value[0])}
                      max={10}
                      min={1}
                      step={0.5}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Higher values follow the prompt more closely, lower values are more creative.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Inference Steps: {inferenceSteps}</Label>
                    <Slider
                      value={[inferenceSteps]}
                      onValueChange={(value) => setInferenceSteps(value[0])}
                      max={100}
                      min={20}
                      step={10}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">More steps = higher quality but slower generation.</p>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" className="border-gray-700 hover:bg-gray-800" onClick={resetImageForm}>
                    Reset
                  </Button>
                  <Button onClick={handleGenerateImage} disabled={imageLoading}>
                    {imageLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="mr-2 h-4 w-4" />
                        Generate Image
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>

              {/* Image Output */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Generated Image</CardTitle>
                    {generatedImage && (
                      <div className="flex gap-2">
                        <Button onClick={handleDownloadImage} size="sm" variant="outline" className="border-gray-700">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button onClick={handleSaveImage} size="sm">
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="min-h-[400px] rounded-md border border-gray-700 bg-gray-800 p-4 flex items-center justify-center">
                    {imageLoading ? (
                      <div className="flex flex-col items-center space-y-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Generating your image...</p>
                      </div>
                    ) : generatedImage ? (
                      <img
                        src={generatedImage || "/placeholder.svg"}
                        alt="Generated image"
                        className="max-w-full max-h-full rounded-lg"
                      />
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Generated image will appear here</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Saved Content Tab */}
          <TabsContent value="saved" className="space-y-4">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Saved Content & Images</CardTitle>
                <CardDescription>View and manage your saved content and generated images</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSaved ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : savedContent.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {savedContent.map((content) => (
                      <Card
                        key={content.id}
                        className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors"
                      >
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            {content.image_url && (
                              <div className="aspect-video rounded-lg overflow-hidden">
                                <img
                                  src={content.image_url || "/placeholder.svg"}
                                  alt={content.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <div>
                              <h3 className="font-medium line-clamp-1">{content.title}</h3>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant="outline" className="text-xs bg-gray-900 border-gray-700">
                                  {content.content_category || "general"}
                                </Badge>
                                {content.sentiment && (
                                  <Badge
                                    variant="outline"
                                    className={`text-xs border-gray-700 ${
                                      content.sentiment === "positive"
                                        ? "bg-green-900/20 text-green-400 border-green-800"
                                        : content.sentiment === "negative"
                                          ? "bg-red-900/20 text-red-400 border-red-800"
                                          : "bg-yellow-900/20 text-yellow-400 border-yellow-800"
                                    }`}
                                  >
                                    {content.sentiment}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{content.content}</p>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                {new Date(content.created_at).toLocaleDateString()}
                              </span>
                              <div className="flex space-x-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => router.push(`/dashboard/content/${content.id}`)}
                                  className="h-8 w-8"
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteContent(content.id)}
                                  className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                  disabled={deletingId === content.id}
                                >
                                  {deletingId === content.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
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
