"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { Loader2, PlusCircle, FolderOpen, Calendar, FileText } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"
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

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openNewProjectDialog, setOpenNewProjectDialog] = useState(false)
  const [openNewContentDialog, setOpenNewContentDialog] = useState(false)
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
  })
  const [newContent, setNewContent] = useState({
    title: "",
    contentType: "product_description",
    prompt: "",
    projectId: "",
  })
  const [creatingProject, setCreatingProject] = useState(false)
  const [generatingContent, setGeneratingContent] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const { data: projectsData, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error

      setProjects(projectsData || [])
    } catch (error) {
      console.error("Error fetching projects:", error)
      toast({
        title: "Error loading projects",
        description: "Failed to load projects. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) {
      toast({
        title: "Missing information",
        description: "Project name is required.",
        variant: "destructive",
      })
      return
    }

    setCreatingProject(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        throw new Error("User not authenticated")
      }

      const { data: projectData, error } = await supabase
        .from("projects")
        .insert({
          name: newProject.name,
          description: newProject.description,
          user_id: userData.user.id,
        })
        .select()
        .single()

      if (error) throw error

      setProjects([projectData, ...projects])
      setNewProject({ name: "", description: "" })
      setOpenNewProjectDialog(false)

      toast({
        title: "Project created",
        description: "Your new project has been created successfully.",
      })
    } catch (error) {
      console.error("Error creating project:", error)
      toast({
        title: "Error creating project",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      })
    } finally {
      setCreatingProject(false)
    }
  }

  const handleGenerateContent = async () => {
    if (!newContent.title.trim() || !newContent.prompt.trim() || !newContent.projectId) {
      toast({
        title: "Missing information",
        description: "Please provide title, prompt, and select a project.",
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

      // Get user data
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        throw new Error("User not authenticated")
      }

      // Save the generated content to the database
      const { data: savedContent, error } = await supabase
        .from("content")
        .insert({
          title: newContent.title,
          content_type: newContent.contentType,
          content: data.content,
          keywords: data.keywords || [],
          sentiment: data.sentiment || "neutral",
          project_id: newContent.projectId,
          user_id: userData.user.id,
          content_category: getCategoryFromContentType(newContent.contentType),
        })
        .select()
        .single()

      if (error) throw error

      // Reset the form
      setNewContent({
        title: "",
        contentType: "product_description",
        prompt: "",
        projectId: "",
      })
      setOpenNewContentDialog(false)

      toast({
        title: "Content generated",
        description: "New content has been generated and added to your project.",
      })

      // Refresh projects to show updated content count
      fetchProjects()
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
            <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
            <p className="text-muted-foreground">Organize your content into projects for better management.</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={openNewContentDialog} onOpenChange={setOpenNewContentDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  New Content
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate New Content</DialogTitle>
                  <DialogDescription>Create content and assign it to a project.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="project-select">Project</Label>
                    <Select
                      value={newContent.projectId}
                      onValueChange={(value) => setNewContent({ ...newContent, projectId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

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

            <Dialog open={openNewProjectDialog} onOpenChange={setOpenNewProjectDialog}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>Create a new project to organize your content.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="project-name">Project Name</Label>
                    <Input
                      id="project-name"
                      value={newProject.name}
                      onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                      placeholder="Enter project name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="project-description">Description</Label>
                    <Textarea
                      id="project-description"
                      value={newProject.description}
                      onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                      placeholder="Enter project description (optional)"
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenNewProjectDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateProject} disabled={creatingProject}>
                    {creatingProject ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Project"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {projects.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card key={project.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-primary" />
                    {project.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {project.description || "No description provided"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(project.created_at)}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link href={`/dashboard/projects/${project.id}`}>View Project</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No projects yet</CardTitle>
              <CardDescription>Create your first project to start organizing your content.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <Button onClick={() => setOpenNewProjectDialog(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Your First Project
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
