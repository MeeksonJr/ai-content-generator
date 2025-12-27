"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import {
  FileText,
  Plus,
  Search,
  Loader2,
  RefreshCw,
  Edit,
  Trash2,
  Eye,
  Share2,
  Star,
  Copy,
  Save,
} from "lucide-react"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Template = {
  id: string
  name: string
  description: string | null
  content_type: string
  template_content: string
  template_prompt: string | null
  is_public: boolean
  is_featured: boolean
  usage_count: number
  category: string | null
  tags: string[] | null
  created_at: string
  updated_at: string
  user_id: string
  user_profiles: {
    display_name: string | null
    avatar_url: string | null
  } | null
}

const CONTENT_TYPES = [
  { value: "product-description", label: "Product Description" },
  { value: "blog-post", label: "Blog Post" },
  { value: "social-media-post", label: "Social Media Post" },
  { value: "email", label: "Email" },
  { value: "ad-copy", label: "Ad Copy" },
  { value: "landing-page", label: "Landing Page" },
  { value: "article", label: "Article" },
  { value: "press-release", label: "Press Release" },
]

export default function TemplatesPage() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [contentTypeFilter, setContentTypeFilter] = useState("all")
  const [showMyTemplates, setShowMyTemplates] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const supabase = createClient()

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    content_type: "product-description",
    template_content: "",
    template_prompt: "",
    is_public: false,
    category: "",
    tags: "",
  })

  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    }
    getCurrentUser()
    fetchTemplates()
  }, [contentTypeFilter, showMyTemplates])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (contentTypeFilter !== "all") {
        params.append("content_type", contentTypeFilter)
      }
      if (!showMyTemplates) {
        params.append("include_public", "true")
      }

      const response = await fetch(`/api/templates?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch templates")
      }

      const data = await response.json()
      let filteredTemplates = data.templates || []

      // Filter by search query
      if (searchQuery) {
        filteredTemplates = filteredTemplates.filter((t: Template) =>
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      }

      // Filter by ownership
      if (showMyTemplates) {
        // Get current user ID from a template (they all have user_id)
        // Actually, we need to get it from session - for now, show all and let API handle it
      }

      setTemplates(filteredTemplates)
    } catch (error) {
      console.error("Error fetching templates:", error)
      toast({
        title: "Error",
        description: "Failed to load templates. Please try again later.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTemplate = async () => {
    if (!formData.name || !formData.template_content) {
      toast({
        title: "Missing fields",
        description: "Name and template content are required.",
        variant: "destructive",
      })
      return
    }

    try {
      setSaving(true)
      const tags = formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)

      const response = await fetch("/api/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          content_type: formData.content_type,
          template_content: formData.template_content,
          template_prompt: formData.template_prompt || null,
          is_public: formData.is_public,
          category: formData.category || null,
          tags: tags.length > 0 ? tags : null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create template")
      }

      toast({
        title: "Template created",
        description: "Your template has been saved successfully.",
      })

      setCreateDialogOpen(false)
      resetForm()
      await fetchTemplates()
    } catch (error) {
      console.error("Error creating template:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create template",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateTemplate = async () => {
    if (!selectedTemplate || !formData.name || !formData.template_content) {
      return
    }

    try {
      setSaving(true)
      const tags = formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)

      const response = await fetch(`/api/templates/${selectedTemplate.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          content_type: formData.content_type,
          template_content: formData.template_content,
          template_prompt: formData.template_prompt || null,
          is_public: formData.is_public,
          category: formData.category || null,
          tags: tags.length > 0 ? tags : null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update template")
      }

      toast({
        title: "Template updated",
        description: "Your template has been updated successfully.",
      })

      setEditDialogOpen(false)
      setSelectedTemplate(null)
      resetForm()
      await fetchTemplates()
    } catch (error) {
      console.error("Error updating template:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update template",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) {
      return
    }

    try {
      setDeleting(templateId)
      const response = await fetch(`/api/templates/${templateId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete template")
      }

      toast({
        title: "Template deleted",
        description: "The template has been deleted successfully.",
      })

      await fetchTemplates()
    } catch (error) {
      console.error("Error deleting template:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete template",
        variant: "destructive",
      })
    } finally {
      setDeleting(null)
    }
  }

  const handleUseTemplate = async (template: Template) => {
    try {
      // Increment usage count
      await fetch(`/api/templates/${template.id}/use`, {
        method: "POST",
      })

      // Copy template content to clipboard
      await navigator.clipboard.writeText(template.template_content)
      
      toast({
        title: "Template copied",
        description: "Template content has been copied to your clipboard. You can now use it in content generation.",
      })
    } catch (error) {
      console.error("Error using template:", error)
      toast({
        title: "Error",
        description: "Failed to use template",
        variant: "destructive",
      })
    }
  }

  const handleEditClick = (template: Template) => {
    setSelectedTemplate(template)
    setFormData({
      name: template.name,
      description: template.description || "",
      content_type: template.content_type,
      template_content: template.template_content,
      template_prompt: template.template_prompt || "",
      is_public: template.is_public,
      category: template.category || "",
      tags: template.tags?.join(", ") || "",
    })
    setEditDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      content_type: "product-description",
      template_content: "",
      template_prompt: "",
      is_public: false,
      category: "",
      tags: "",
    })
  }

  const filteredTemplates = templates.filter((template) => {
    if (contentTypeFilter !== "all" && template.content_type !== contentTypeFilter) {
      return false
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        template.name.toLowerCase().includes(query) ||
        template.description?.toLowerCase().includes(query) ||
        template.tags?.some((tag) => tag.toLowerCase().includes(query))
      )
    }
    return true
  })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Content Templates</h2>
            <p className="text-muted-foreground">Save and reuse content templates for faster generation</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchTemplates} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-800 max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Content Template</DialogTitle>
                  <DialogDescription>Save a reusable template for content generation</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="template-name">Template Name *</Label>
                    <Input
                      id="template-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="bg-gray-800 border-gray-700"
                      placeholder="e.g., Product Launch Email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-description">Description</Label>
                    <Textarea
                      id="template-description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="bg-gray-800 border-gray-700"
                      placeholder="Brief description of what this template is for..."
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="template-type">Content Type *</Label>
                      <Select value={formData.content_type} onValueChange={(value) => setFormData({ ...formData, content_type: value })}>
                        <SelectTrigger id="template-type" className="bg-gray-800 border-gray-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONTENT_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="template-category">Category</Label>
                      <Input
                        id="template-category"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="bg-gray-800 border-gray-700"
                        placeholder="e.g., Marketing, Sales"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-content">Template Content *</Label>
                    <Textarea
                      id="template-content"
                      value={formData.template_content}
                      onChange={(e) => setFormData({ ...formData, template_content: e.target.value })}
                      className="bg-gray-800 border-gray-700 font-mono text-sm"
                      placeholder="Enter your template content here. You can use variables like {{variable_name}}..."
                      rows={10}
                    />
                    <p className="text-xs text-muted-foreground">
                      Use variables like {"{{variable_name}}"} that can be replaced when using the template
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-prompt">Template Prompt (Optional)</Label>
                    <Textarea
                      id="template-prompt"
                      value={formData.template_prompt}
                      onChange={(e) => setFormData({ ...formData, template_prompt: e.target.value })}
                      className="bg-gray-800 border-gray-700"
                      placeholder="Prompt to use when generating content with this template..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-tags">Tags (comma-separated)</Label>
                    <Input
                      id="template-tags"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      className="bg-gray-800 border-gray-700"
                      placeholder="marketing, email, product"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="template-public"
                      checked={formData.is_public}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
                    />
                    <Label htmlFor="template-public" className="cursor-pointer">
                      Make this template public (share with all users)
                    </Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTemplate} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Template
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-gray-800 border-gray-700"
                  />
                </div>
              </div>
              <Select value={contentTypeFilter} onValueChange={setContentTypeFilter}>
                <SelectTrigger className="w-[200px] bg-gray-800 border-gray-700">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {CONTENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-my-templates"
                  checked={showMyTemplates}
                  onCheckedChange={setShowMyTemplates}
                />
                <Label htmlFor="show-my-templates" className="cursor-pointer">
                  My Templates Only
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Templates Grid */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="bg-gray-900 border-gray-800">
                <CardContent className="p-4">
                  <Skeleton className="h-6 w-32 mb-2" />
                  <Skeleton className="h-4 w-full mb-4" />
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No templates found</p>
              <p className="text-sm text-muted-foreground mt-2">
                {searchQuery || contentTypeFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Create your first template to get started"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="bg-gray-900 border-gray-800 hover:border-primary/50 transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      {template.description && (
                        <CardDescription className="mt-1">{template.description}</CardDescription>
                      )}
                    </div>
                    {template.is_featured && (
                      <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">
                      {CONTENT_TYPES.find((t) => t.value === template.content_type)?.label || template.content_type}
                    </Badge>
                    {template.is_public && (
                      <Badge variant="outline" className="text-xs bg-blue-900/20 text-blue-400 border-blue-800">
                        <Share2 className="h-3 w-3 mr-1" />
                        Public
                      </Badge>
                    )}
                    {template.category && (
                      <Badge variant="outline" className="text-xs">
                        {template.category}
                      </Badge>
                    )}
                  </div>
                  {template.tags && template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {template.tags.slice(0, 3).map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {template.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                  <div className="p-3 bg-gray-800 rounded text-sm max-h-32 overflow-y-auto">
                    <p className="text-muted-foreground line-clamp-4">{template.template_content}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Used {template.usage_count || 0} times</span>
                    <span>{format(new Date(template.created_at), "MMM dd, yyyy")}</span>
                  </div>
                </CardContent>
                <CardContent className="pt-0">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-gray-700"
                      onClick={() => handleUseTemplate(template)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Use
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-700"
                      onClick={() => {
                        // View template details
                        setSelectedTemplate(template)
                        setFormData({
                          name: template.name,
                          description: template.description || "",
                          content_type: template.content_type,
                          template_content: template.template_content,
                          template_prompt: template.template_prompt || "",
                          is_public: template.is_public,
                          category: template.category || "",
                          tags: template.tags?.join(", ") || "",
                        })
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {template.user_id && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-gray-700"
                          onClick={() => handleEditClick(template)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-700 text-red-400 hover:bg-red-900/20"
                          onClick={() => handleDeleteTemplate(template.id)}
                          disabled={deleting === template.id}
                        >
                          {deleting === template.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="bg-gray-900 border-gray-800 max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Template</DialogTitle>
              <DialogDescription>Update your content template</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-template-name">Template Name *</Label>
                <Input
                  id="edit-template-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-gray-800 border-gray-700"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-template-description">Description</Label>
                <Textarea
                  id="edit-template-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-gray-800 border-gray-700"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-template-type">Content Type *</Label>
                  <Select value={formData.content_type} onValueChange={(value) => setFormData({ ...formData, content_type: value })}>
                    <SelectTrigger id="edit-template-type" className="bg-gray-800 border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-template-category">Category</Label>
                  <Input
                    id="edit-template-category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="bg-gray-800 border-gray-700"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-template-content">Template Content *</Label>
                <Textarea
                  id="edit-template-content"
                  value={formData.template_content}
                  onChange={(e) => setFormData({ ...formData, template_content: e.target.value })}
                  className="bg-gray-800 border-gray-700 font-mono text-sm"
                  rows={10}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-template-prompt">Template Prompt (Optional)</Label>
                <Textarea
                  id="edit-template-prompt"
                  value={formData.template_prompt}
                  onChange={(e) => setFormData({ ...formData, template_prompt: e.target.value })}
                  className="bg-gray-800 border-gray-700"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-template-tags">Tags (comma-separated)</Label>
                <Input
                  id="edit-template-tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="bg-gray-800 border-gray-700"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-template-public"
                  checked={formData.is_public}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
                />
                <Label htmlFor="edit-template-public" className="cursor-pointer">
                  Make this template public
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateTemplate} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Update Template
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

