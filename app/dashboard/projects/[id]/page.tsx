"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"
import { Loader2, PlusCircle, Edit, Trash2, FileText, BarChart3 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [project, setProject] = useState<any>(null)
  const [contents, setContents] = useState<any[]>([])
  const [editMode, setEditMode] = useState(false)
  const [projectName, setProjectName] = useState("")
  const [projectDescription, setProjectDescription] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [openNewContentDialog, setOpenNewContentDialog] = useState(false)
  const [newContent, setNewContent] = useState({
    title: "",
    contentType: "product_description",
    prompt: "",
  })
  const [generatingContent, setGeneratingContent] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchProjectData(params.id as string)
    }
  }, [params.id])

  const fetchProjectData = async (projectId: string) => {
    try {
      setLoading(true)

      // Get project details
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single()

      if (projectError) throw projectError

      // Get project contents
      const { data: contentData, error: contentError } = await supabase
        .from("content")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })

      if (contentError) throw contentError

      setProject(projectData)
      setProjectName(projectData.name)
      setProjectDescription(projectData.description || "")
      setContents(contentData || [])
    } catch (error) {
      console.error("Error fetching project data:", error)
      toast({
        title: "Error loading project",
        description: "Failed to load project data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProject = async () => {
    if (!projectName.trim()) {
      toast({
        title: "Missing information",
        description: "Project name is required.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from("projects")
        .update({
          name: projectName,
          description: projectDescription,
          updated_at: new Date().toISOString(),
        })
        .eq("id", project.id)

      if (error) throw error

      setProject({
        ...project,
        name: projectName,
        description: projectDescription,
      })
      setEditMode(false)

      toast({
        title: "Project updated",
        description: "Project details have been updated successfully.",
      })
    } catch (error) {
      console.error("Error updating project:", error)
      toast({
        title: "Error updating project",
        description: "Failed to update project. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteProject = async () => {
    setDeleting(true)
    try {
      // Delete all content associated with the project
      const { error: contentError } = await supabase.from("content").delete().eq("project_id", project.id)

      if (contentError) throw contentError

      // Delete the project
      const { error: projectError } = await supabase.from("projects").delete().eq("id", project.id)

      if (projectError) throw projectError

      toast({
        title: "Project deleted",
        description: "Project and all associated content have been deleted.",
      })

      router.push("/dashboard/projects")
    } catch (error) {
      console.error("Error deleting project:", error)
      toast({
        title: "Error deleting project",
        description: "Failed to delete project. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  const handleGenerateContent = async () => {
    if (!newContent.title.trim() || !newContent.prompt.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both a title and prompt for your content.",
        variant: "destructive",
      })
      return
    }

    setGeneratingContent(true)
    try {
      // Generate content using the AI
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contentType: newContent.contentType.replace("_", "-"), // Convert to kebab-case
          title: newContent.title,
          prompt: newContent.prompt,
          temperature: 0.7,
          maxLength: 1000,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate content")
      }

      const data = await response.json()

      // Save the generated content to the database
      const { data: savedContent, error } = await supabase
        .from("content")
        .insert({
          title: newContent.title,
          content_type: newContent.contentType,
          content: data.content,
          keywords: data.keywords || [],
          sentiment: data.sentiment || "neutral",
          project_id: project.id,
          user_id: project.user_id,
          content_category: getCategoryFromContentType(newContent.contentType),
        })
        .select()
        .single()

      if (error) throw error

      // Add the new content to the list
      setContents([savedContent, ...contents])

      // Reset the form
      setNewContent({
        title: "",
        contentType: "product_description",
        prompt: "",
      })
      setOpenNewContentDialog(false)

      toast({
        title: "Content generated",
        description: "New content has been generated and added to your project.",
      })
    } catch (error) {
      console.error("Error generating content:", error)
      toast({
        title: "Error generating content",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setGeneratingContent(false)
    }
  }

  // Add this helper function
  const getCategoryFromContentType = (contentType: string): string => {
    switch (contentType) {
      case "product_description":
        return "product"
      case "blog_post":
        return "blog"
      case "social_media":
        return "social"
      case "email":
        return "email"
      default:
        return "general"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatContentType = (type: string) => {
    switch (type) {
      case "product_description":
        return "Product Description"
      case "blog_post":
        return "Blog Post"
      case "social_media":
        return "Social Media"
      case "email":
        return "Email"
      default:
        return type.charAt(0).toUpperCase() + type.slice(1)
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
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{project.name}</h2>
            <p className="text-muted-foreground">Created on {formatDate(project.created_at)}</p>
          </div>
          <div className="flex items-center space-x-2">
            {!editMode ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDeleteProject} disabled={deleting}>
                  {deleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveProject} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {editMode ? (
          <Card>
            <CardHeader>
              <CardTitle>Edit Project</CardTitle>
              <CardDescription>Update your project details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project Name</Label>
                <Input
                  id="project-name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-description">Description</Label>
                <Textarea
                  id="project-description"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Enter project description"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {project.description && (
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{project.description}</p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Content</h3>
          <Dialog open={openNewContentDialog} onOpenChange={setOpenNewContentDialog}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                New Content
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate New Content</DialogTitle>
                <DialogDescription>Fill in the details below to generate content for your project.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="content-type">Content Type</Label>
                  <Select
                    value={newContent.contentType}
                    onValueChange={(value) => setNewContent({ ...newContent, contentType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select content type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="product_description">Product Description</SelectItem>
                      <SelectItem value="blog_post">Blog Post</SelectItem>
                      <SelectItem value="social_media">Social Media Post</SelectItem>
                      <SelectItem value="email">Email Template</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content-title">Title</Label>
                  <Input
                    id="content-title"
                    value={newContent.title}
                    onChange={(e) => setNewContent({ ...newContent, title: e.target.value })}
                    placeholder="Enter a title for your content"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content-prompt">Prompt</Label>
                  <Textarea
                    id="content-prompt"
                    value={newContent.prompt}
                    onChange={(e) => setNewContent({ ...newContent, prompt: e.target.value })}
                    placeholder="Provide details about what you want to generate"
                    rows={5}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenNewContentDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleGenerateContent} disabled={generatingContent}>
                  {generatingContent ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate Content"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Content</TabsTrigger>
            <TabsTrigger value="product_description">Product Descriptions</TabsTrigger>
            <TabsTrigger value="blog_post">Blog Posts</TabsTrigger>
            <TabsTrigger value="social_media">Social Media</TabsTrigger>
            <TabsTrigger value="email">Emails</TabsTrigger>
          </TabsList>

          {["all", "product_description", "blog_post", "social_media", "email"].map((tab) => (
            <TabsContent key={tab} value={tab}>
              <div className="grid gap-4">
                {contents.length > 0 ? (
                  contents
                    .filter((content) => tab === "all" || content.content_type === tab)
                    .map((content) => (
                      <Card key={content.id}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle>{content.title}</CardTitle>
                            <Badge variant="outline">{formatContentType(content.content_type)}</Badge>
                          </div>
                          <CardDescription>Created on {formatDate(content.created_at)}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="line-clamp-3">{content.content}</p>
                          {content.keywords && content.keywords.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {content.keywords.map((keyword: string, index: number) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {keyword}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </CardContent>
                        <CardFooter className="flex justify-between">
                          <div className="flex items-center">
                            {content.sentiment && (
                              <Badge
                                className={
                                  content.sentiment === "positive"
                                    ? "bg-green-100 text-green-800"
                                    : content.sentiment === "negative"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-yellow-100 text-yellow-800"
                                }
                              >
                                {content.sentiment.charAt(0).toUpperCase() + content.sentiment.slice(1)}
                              </Badge>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/dashboard/content/${content.id}`}>
                                <FileText className="mr-2 h-4 w-4" />
                                View
                              </Link>
                            </Button>
                            <Button variant="outline" size="sm">
                              <BarChart3 className="mr-2 h-4 w-4" />
                              Analyze
                            </Button>
                          </div>
                        </CardFooter>
                      </Card>
                    ))
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>No content yet</CardTitle>
                      <CardDescription>
                        This project doesn't have any content yet. Click "New Content" to get started.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-center">
                        <Button onClick={() => setOpenNewContentDialog(true)}>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          New Content
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
