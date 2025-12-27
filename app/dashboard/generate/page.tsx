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
import { motion, AnimatePresence } from "framer-motion"
import type { ContentRow } from "@/lib/types/dashboard.types"

export default function GeneratePage() {
  // Content Generation State
  const [contentLoading, setContentLoading] = useState(false)
  const [title, setTitle] = useState("")
  const [contentType, setContentType] = useState("product-description")
  const [prompt, setPrompt] = useState("")
  const [generatedContent, setGeneratedContent] = useState("")
  const [sentiment, setSentiment] = useState<string | null>(null)
  const [keywords, setKeywords] = useState<(string | { keyword: string })[]>([])
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
  const [savedContent, setSavedContent] = useState<ContentRow[]>([])
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

      // Convert base64 image to blob
      let imageBlob: Blob | null = null
      let imageUrl: string | null = null

      if (generatedImage.startsWith("data:image")) {
        // Base64 data URL
        const response = await fetch(generatedImage)
        imageBlob = await response.blob()
      } else if (generatedImage.startsWith("http")) {
        // Already a URL, use it directly
        imageUrl = generatedImage
      } else {
        // Assume it's base64 without data URL prefix
        const base64Data = generatedImage.replace(/^data:image\/\w+;base64,/, "")
        const byteCharacters = atob(base64Data)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        imageBlob = new Blob([byteArray], { type: "image/png" })
      }

      // Upload to Supabase Storage if we have a blob
      if (!imageUrl && imageBlob) {
        const fileExt = "png"
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        // Don't include bucket name in path - just the file path within the bucket
        const filePath = fileName

        const { error: uploadError } = await supabase.storage.from("generated-images").upload(filePath, imageBlob, {
          contentType: "image/png",
          upsert: false,
        })

        if (uploadError) {
          throw new Error(`Failed to upload image: ${uploadError.message}`)
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("generated-images").getPublicUrl(filePath)
        imageUrl = publicUrl
      }

      if (!imageUrl) {
        throw new Error("Failed to get image URL")
      }

      // Save to database with the image URL
      const imageTitle = imagePrompt.substring(0, 50) || "Generated Image"
      const imageDescription = `Generated image: ${imagePrompt}`

      const { data, error } = await supabase
        .from("content")
        // @ts-ignore - Known Supabase type inference issue with insert operations
        .insert({
          title: imageTitle,
          content_type: "image",
          content: imageDescription,
          image_url: imageUrl,
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
        description: "Your image has been saved successfully",
      })

      fetchSavedContent()
    } catch (error) {
      console.error("Error saving image:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save image",
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
        // @ts-ignore - Known Supabase type inference issue with insert operations
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

      const dataArray = (data as ContentRow[]) || []
      if (dataArray && dataArray.length > 0 && dataArray[0]?.id) {
        router.push(`/dashboard/content/${dataArray[0].id}`)
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
      },
    },
  }

  return (
    <DashboardLayout>
      <motion.div
        className="space-y-6"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div variants={itemVariants} className="space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                AI Content Studio
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base mt-1 sm:mt-2">
                Generate high-quality content and images using advanced AI technology
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Tabs defaultValue="content" className="space-y-4 sm:space-y-6">
          <TabsList className="bg-gray-900 border-gray-800 w-full sm:w-auto">
            <TabsTrigger value="content" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-3 sm:px-4">
              <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Generate Content</span>
              <span className="sm:hidden">Content</span>
            </TabsTrigger>
            <TabsTrigger value="image" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-3 sm:px-4">
              <ImageIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Generate Image</span>
              <span className="sm:hidden">Image</span>
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-3 sm:px-4">
              <Save className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Saved Content</span>
              <span className="sm:hidden">Saved</span>
            </TabsTrigger>
          </TabsList>

          {/* Content Generation Tab */}
          <TabsContent value="content" className="space-y-4">
            <AnimatePresence>
            {usingFallback && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
              <Alert variant="default" className="bg-yellow-900/20 border-yellow-800">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>AI Service Notice</AlertTitle>
                <AlertDescription>
                  Our AI service is currently experiencing high demand. We've provided a basic template. For best
                  results, please try again later.
                </AlertDescription>
              </Alert>
                </motion.div>
            )}
            </AnimatePresence>

            <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
              {/* Content Input */}
              <motion.div
                variants={itemVariants}
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.2 }}
              >
              <Card className="bg-gradient-to-br from-gray-900 to-gray-950 border-gray-800 hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-primary/10">
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                      <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    Content Settings
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Configure your content generation preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-xs sm:text-sm">Title (Optional)</Label>
                    <Input
                      id="title"
                      placeholder="Enter a title for your content"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="bg-gray-800 border-gray-700 h-9 sm:h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content-type" className="text-xs sm:text-sm">Content Type</Label>
                    <Select value={contentType} onValueChange={setContentType}>
                      <SelectTrigger id="content-type" className="bg-gray-800 border-gray-700 h-9 sm:h-10 text-sm">
                        <SelectValue placeholder="Select content type" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        {contentTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value} className="text-sm">
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prompt" className="text-xs sm:text-sm">Content Prompt</Label>
                    <Textarea
                      id="prompt"
                      placeholder="Describe what you want to generate..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={5}
                      className="bg-gray-800 border-gray-700 text-sm resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Be specific about what you want to generate for better results
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs sm:text-sm">Creativity (Temperature)</Label>
                      <span className="text-xs font-medium text-primary">{temperature}</span>
                    </div>
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
                    <div className="flex items-center justify-between">
                      <Label className="text-xs sm:text-sm">Maximum Length</Label>
                      <span className="text-xs font-medium text-primary">{maxLength} tokens</span>
                    </div>
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
                <CardFooter className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-0 pt-4">
                  <Button 
                    variant="outline" 
                    className="border-gray-700 hover:bg-gray-800 w-full sm:w-auto h-9 sm:h-10" 
                    onClick={resetContentForm}
                  >
                    Reset
                  </Button>
                  <Button 
                    onClick={handleGenerateContent} 
                    disabled={contentLoading}
                    className="w-full sm:w-auto h-9 sm:h-10 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90"
                  >
                    {contentLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        <span className="hidden sm:inline">Generating...</span>
                        <span className="sm:hidden">Generating</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">Generate Content</span>
                        <span className="sm:hidden">Generate</span>
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
              </motion.div>

              {/* Content Output */}
              <motion.div
                variants={itemVariants}
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.2 }}
              >
              <Card className="bg-gradient-to-br from-gray-900 to-gray-950 border-gray-800 hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-primary/10">
                <CardHeader className="pb-3 sm:pb-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                    <CardTitle className="text-base sm:text-lg">Generated Content</CardTitle>
                    {generatedContent && (
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                          onClick={() => handleCopyToClipboard(generatedContent)}
                          size="sm"
                          variant="outline"
                          className="border-gray-700 hover:bg-gray-800 flex-1 sm:flex-initial h-9"
                        >
                          <Copy className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                          <span className="text-xs sm:text-sm">Copy</span>
                        </Button>
                        <Button onClick={handleSaveContent} size="sm" className="flex-1 sm:flex-initial h-9">
                          <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                          <span className="text-xs sm:text-sm">Save</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  <div className="min-h-[300px] sm:min-h-[400px] rounded-lg border border-gray-700 bg-gray-800/50 p-3 sm:p-4 overflow-auto">
                    <AnimatePresence mode="wait">
                    {contentLoading ? (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex flex-col h-full items-center justify-center space-y-4"
                        >
                          <div className="relative">
                            <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-primary" />
                            <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-primary animate-pulse absolute inset-0 m-auto" />
                          </div>
                          <div className="text-center space-y-2">
                            <p className="text-sm sm:text-base font-medium text-white">Generating content...</p>
                            <p className="text-xs sm:text-sm text-muted-foreground">This may take a few moments</p>
                          </div>
                        </motion.div>
                    ) : generatedContent ? (
                        <motion.div
                          key="content"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.3 }}
                          className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed"
                        >
                          {generatedContent}
                        </motion.div>
                    ) : (
                        <motion.div
                          key="empty"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex flex-col h-full items-center justify-center text-muted-foreground space-y-3"
                        >
                          <div className="p-4 rounded-full bg-gray-800 border border-gray-700">
                            <Sparkles className="h-8 w-8 sm:h-10 sm:w-10 text-gray-600" />
                          </div>
                          <p className="text-sm sm:text-base text-center">Generated content will appear here</p>
                          <p className="text-xs text-gray-600 text-center max-w-xs">
                            Fill in the form on the left and click "Generate Content" to get started
                          </p>
                        </motion.div>
                    )}
                    </AnimatePresence>
                  </div>

                  <AnimatePresence>
                  {generatedContent && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4"
                      >
                      {sentiment && (
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="flex items-center space-x-2"
                          >
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
                          </motion.div>
                      )}

                      {keywords.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="space-y-2"
                          >
                          <div className="flex items-center space-x-2">
                            <Tag className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Keywords:</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {keywords.map((keyword, index) => (
                                <motion.div
                                  key={index}
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 0.3 + index * 0.05 }}
                                >
                                  <Badge variant="outline" className="bg-gray-800 border-gray-700">
                                {typeof keyword === "string" ? keyword : keyword.keyword ?? ""}
                              </Badge>
                                </motion.div>
                            ))}
                          </div>
                          </motion.div>
                      )}
                      </motion.div>
                  )}
                  </AnimatePresence>
                </CardContent>
              </Card>
              </motion.div>
            </div>
          </TabsContent>

          {/* Image Generation Tab */}
          <TabsContent value="image" className="space-y-4">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Image Input */}
              <motion.div
                variants={itemVariants}
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.2 }}
              >
              <Card className="bg-gradient-to-br from-gray-900 to-gray-950 border-gray-800 hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-primary/10">
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                      <Wand2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    Image Settings
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Configure your image generation preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="image-prompt" className="text-xs sm:text-sm">Image Prompt</Label>
                    <Textarea
                      id="image-prompt"
                      placeholder="Describe the image you want to generate..."
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      rows={4}
                      className="bg-gray-800 border-gray-700 text-sm resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Be descriptive about the style, colors, and composition you want
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs sm:text-sm">Width</Label>
                        <span className="text-xs font-medium text-primary">{imageWidth}px</span>
                      </div>
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
                      <div className="flex items-center justify-between">
                        <Label className="text-xs sm:text-sm">Height</Label>
                        <span className="text-xs font-medium text-primary">{imageHeight}px</span>
                      </div>
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
                    <div className="flex items-center justify-between">
                      <Label className="text-xs sm:text-sm">Guidance Scale</Label>
                      <span className="text-xs font-medium text-primary">{guidanceScale}</span>
                    </div>
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
                    <div className="flex items-center justify-between">
                      <Label className="text-xs sm:text-sm">Inference Steps</Label>
                      <span className="text-xs font-medium text-primary">{inferenceSteps}</span>
                    </div>
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
                <CardFooter className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-0 pt-4">
                  <Button 
                    variant="outline" 
                    className="border-gray-700 hover:bg-gray-800 w-full sm:w-auto h-9 sm:h-10" 
                    onClick={resetImageForm}
                  >
                    Reset
                  </Button>
                  <Button 
                    onClick={handleGenerateImage} 
                    disabled={imageLoading}
                    className="w-full sm:w-auto h-9 sm:h-10 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90"
                  >
                    {imageLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        <span className="hidden sm:inline">Generating...</span>
                        <span className="sm:hidden">Generating</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">Generate Image</span>
                        <span className="sm:hidden">Generate</span>
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
              </motion.div>

              {/* Image Output */}
              <motion.div
                variants={itemVariants}
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.2 }}
              >
              <Card className="bg-gradient-to-br from-gray-900 to-gray-950 border-gray-800 hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-primary/10">
                <CardHeader className="pb-3 sm:pb-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                    <CardTitle className="text-base sm:text-lg">Generated Image</CardTitle>
                    {generatedImage && (
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button 
                          onClick={handleDownloadImage} 
                          size="sm" 
                          variant="outline" 
                          className="border-gray-700 hover:bg-gray-800 flex-1 sm:flex-initial h-9"
                        >
                          <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                          <span className="text-xs sm:text-sm">Download</span>
                        </Button>
                        <Button onClick={handleSaveImage} size="sm" className="flex-1 sm:flex-initial h-9">
                          <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                          <span className="text-xs sm:text-sm">Save</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="min-h-[300px] sm:min-h-[400px] rounded-lg border border-gray-700 bg-gray-800/50 p-3 sm:p-4 flex items-center justify-center">
                    <AnimatePresence mode="wait">
                    {imageLoading ? (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex flex-col items-center space-y-4"
                        >
                          <div className="relative">
                            <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-primary" />
                            <ImageIcon className="h-6 w-6 sm:h-8 sm:w-8 text-primary animate-pulse absolute inset-0 m-auto" />
                          </div>
                          <div className="text-center space-y-2">
                            <p className="text-sm sm:text-base font-medium text-white">Generating your image...</p>
                            <p className="text-xs sm:text-sm text-muted-foreground">This may take a few moments</p>
                          </div>
                        </motion.div>
                    ) : generatedImage ? (
                        <motion.img
                          key="image"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.3 }}
                        src={generatedImage || "/placeholder.svg"}
                        alt="Generated image"
                        className="max-w-full max-h-full rounded-lg shadow-lg"
                      />
                    ) : (
                        <motion.div
                          key="empty"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex flex-col items-center text-center text-muted-foreground space-y-3"
                        >
                          <div className="p-4 rounded-full bg-gray-800 border border-gray-700">
                            <ImageIcon className="h-8 w-8 sm:h-10 sm:w-10 text-gray-600" />
                          </div>
                          <p className="text-sm sm:text-base">Generated image will appear here</p>
                          <p className="text-xs text-gray-600 max-w-xs">
                            Fill in the form on the left and click "Generate Image" to get started
                          </p>
                        </motion.div>
                    )}
                    </AnimatePresence>
                  </div>
                </CardContent>
              </Card>
              </motion.div>
            </div>
          </TabsContent>

          {/* Saved Content Tab */}
          <TabsContent value="saved" className="space-y-4">
            <motion.div variants={itemVariants}>
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
                  <motion.div
                    className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                    variants={containerVariants}
                  >
                    {savedContent.map((content, index) => (
                      <motion.div
                        key={content.id}
                        variants={itemVariants}
                        whileHover={{ y: -4, scale: 1.02 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      >
                      <Card
                        className="bg-gray-800 border-gray-700 hover:border-primary/50 transition-all cursor-pointer"
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
                                  title="View details"
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteContent(content.id)}
                                  className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                  disabled={deletingId === content.id}
                                  title="Delete"
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
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No saved content</h3>
                    <p className="text-muted-foreground mt-1">Generate and save content to see it here</p>
                  </div>
                )}
              </CardContent>
            </Card>
            </motion.div>
          </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  )
}
