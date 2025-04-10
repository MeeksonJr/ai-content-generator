"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Save, Copy, ArrowLeft, Sparkles } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"

export default function ContentDetailPage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true)
  const [enhancing, setEnhancing] = useState(false)
  const [content, setContent] = useState<any>(null)
  const [editedContent, setEditedContent] = useState("")
  const [editedTitle, setEditedTitle] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchContent()
  }, [params.id])

  const fetchContent = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from("content").select("*").eq("id", params.id).single()

      if (error) {
        throw error
      }

      if (!data) {
        toast({
          title: "Content not found",
          description: "The requested content could not be found",
          variant: "destructive",
        })
        router.push("/dashboard/generate")
        return
      }

      setContent(data)
      setEditedContent(data.content)
      setEditedTitle(data.title)
    } catch (error) {
      console.error("Error fetching content:", error)
      toast({
        title: "Error",
        description: "Failed to load content",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(content.content)
    toast({
      title: "Copied",
      description: "Content copied to clipboard",
    })
  }

  const handleSaveChanges = async () => {
    try {
      setLoading(true)
      const { error } = await supabase
        .from("content")
        .update({
          title: editedTitle,
          content: editedContent,
        })
        .eq("id", params.id)

      if (error) {
        throw error
      }

      toast({
        title: "Changes saved",
        description: "Your content has been updated successfully",
      })

      // Refresh content
      fetchContent()
      setIsEditing(false)
    } catch (error) {
      console.error("Error saving changes:", error)
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEnhanceContent = async () => {
    try {
      setEnhancing(true)
      const response = await fetch("/api/ai/enhance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: content.content,
          contentType: content.content_type,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to enhance content")
      }

      const data = await response.json()
      setEditedContent(data.enhancedContent)
      setIsEditing(true)

      toast({
        title: "Content enhanced",
        description: "Your content has been enhanced with AI",
      })
    } catch (error) {
      console.error("Error enhancing content:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to enhance content",
        variant: "destructive",
      })
    } finally {
      setEnhancing(false)
    }
  }

  const handleDeleteContent = async () => {
    if (!confirm("Are you sure you want to delete this content? This action cannot be undone.")) {
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase.from("content").delete().eq("id", params.id)

      if (error) {
        throw error
      }

      toast({
        title: "Content deleted",
        description: "Your content has been deleted successfully",
      })

      router.push("/dashboard/generate")
    } catch (error) {
      console.error("Error deleting content:", error)
      toast({
        title: "Error",
        description: "Failed to delete content",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/generate")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h2 className="text-3xl font-bold tracking-tight">{content.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyToClipboard}>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteContent}>
              Delete
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Content Details</CardTitle>
              <CardDescription>Information about this content</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">Content Type</div>
                <div className="flex">
                  <Badge variant="outline" className="bg-gray-800 border-gray-700">
                    {content.content_type
                      .split("-")
                      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(" ")}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Created At</div>
                <div className="text-muted-foreground">
                  {new Date(content.created_at).toLocaleDateString()} at{" "}
                  {new Date(content.created_at).toLocaleTimeString()}
                </div>
              </div>
              {content.sentiment && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Sentiment</div>
                  <div className="flex">
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
                  </div>
                </div>
              )}
              {content.keywords && content.keywords.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Keywords</div>
                  <div className="flex flex-wrap gap-2">
                    {content.keywords.map((keyword: string, index: number) => (
                      <Badge key={index} variant="outline" className="bg-gray-800 border-gray-700">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={handleEnhanceContent} disabled={enhancing} className="w-full" variant="secondary">
                {enhancing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enhancing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Enhance with AI
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>{isEditing ? "Edit Content" : "Content"}</CardTitle>
              <CardDescription>
                {isEditing ? "Make changes to your content" : "View your generated content"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content">Content</Label>
                    <Textarea
                      id="content"
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      rows={12}
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                </div>
              ) : (
                <div className="min-h-[300px] rounded-md border border-gray-700 bg-gray-800 p-4 whitespace-pre-wrap">
                  {content.content}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)} className="border-gray-700">
                    Cancel
                  </Button>
                  <Button onClick={handleSaveChanges}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)} className="w-full">
                  Edit Content
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
