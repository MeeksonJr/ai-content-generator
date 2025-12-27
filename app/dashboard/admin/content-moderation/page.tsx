"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  Flag,
  Loader2,
  RefreshCw,
  Eye,
  FileText,
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Content = {
  id: string
  title: string
  content_type: string
  content: string
  moderation_status: string
  flagged_at: string | null
  flagged_by: string | null
  flag_reason: string | null
  moderation_notes: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  created_at: string
  user_id: string
  user_profiles: {
    display_name: string | null
    email: string | null
  } | null
}

export default function ContentModerationPage() {
  const { toast } = useToast()
  const [content, setContent] = useState<Content[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")
  const [reviewing, setReviewing] = useState<string | null>(null)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [selectedContent, setSelectedContent] = useState<Content | null>(null)
  const [reviewStatus, setReviewStatus] = useState("approved")
  const [reviewNotes, setReviewNotes] = useState("")

  useEffect(() => {
    checkAdminAndFetch()
  }, [statusFilter])

  const checkAdminAndFetch = async () => {
    try {
      const adminResponse = await fetch("/api/admin/check")
      if (!adminResponse.ok) {
        setIsAdmin(false)
        setLoading(false)
        return
      }

      const adminData = await adminResponse.json()
      if (!adminData.isAdmin) {
        setIsAdmin(false)
        setLoading(false)
        return
      }

      setIsAdmin(true)
      await fetchContent()
    } catch (error) {
      console.error("Error checking admin status:", error)
      setIsAdmin(false)
      setLoading(false)
    }
  }

  const fetchContent = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/content?status=${statusFilter}`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch content")
      }

      const data = await response.json()
      setContent(data.content || [])
    } catch (error) {
      console.error("Error fetching content:", error)
      toast({
        title: "Error",
        description: "Failed to load content. Please try again later.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReviewClick = (item: Content) => {
    setSelectedContent(item)
    setReviewStatus(item.moderation_status === "flagged" ? "rejected" : "approved")
    setReviewNotes(item.moderation_notes || "")
    setReviewDialogOpen(true)
  }

  const handleReviewSubmit = async () => {
    if (!selectedContent) return

    try {
      setReviewing(selectedContent.id)
      const response = await fetch(`/api/admin/content/${selectedContent.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: reviewStatus,
          notes: reviewNotes || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update content status")
      }

      toast({
        title: "Content reviewed",
        description: `Content has been marked as ${reviewStatus}.`,
      })

      setReviewDialogOpen(false)
      setSelectedContent(null)
      setReviewStatus("approved")
      setReviewNotes("")
      await fetchContent()
    } catch (error) {
      console.error("Error reviewing content:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to review content",
        variant: "destructive",
      })
    } finally {
      setReviewing(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-900/20 text-green-400 border-green-800">Approved</Badge>
      case "rejected":
        return <Badge className="bg-red-900/20 text-red-400 border-red-800">Rejected</Badge>
      case "flagged":
        return <Badge className="bg-orange-900/20 text-orange-400 border-orange-800">Flagged</Badge>
      case "pending":
      default:
        return <Badge className="bg-yellow-900/20 text-yellow-400 border-yellow-800">Pending</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle2 className="h-4 w-4 text-green-400" />
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-400" />
      case "flagged":
        return <Flag className="h-4 w-4 text-orange-400" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-400" />
    }
  }

  const stats = {
    total: content.length,
    pending: content.filter((c) => c.moderation_status === "pending").length,
    flagged: content.filter((c) => c.moderation_status === "flagged").length,
    approved: content.filter((c) => c.moderation_status === "approved").length,
    rejected: content.filter((c) => c.moderation_status === "rejected").length,
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

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>You must be an administrator to access this page.</AlertDescription>
        </Alert>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Content Moderation</h2>
            <p className="text-muted-foreground">Review and moderate generated content</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchContent} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4 flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-yellow-400" />
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4 flex items-center gap-3">
              <Flag className="h-8 w-8 text-orange-400" />
              <div>
                <p className="text-sm text-muted-foreground">Flagged</p>
                <p className="text-2xl font-bold">{stats.flagged}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-400" />
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">{stats.approved}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4 flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-400" />
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold">{stats.rejected}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Content List</CardTitle>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="flagged">Flagged</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 border border-gray-800 rounded-lg">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-8 w-24" />
                  </div>
                ))}
              </div>
            ) : content.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No content found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {statusFilter !== "all" ? `No content with status "${statusFilter}"` : "No content to moderate"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {content.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 p-4 border border-gray-800 rounded-lg bg-gray-950"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-white">{item.title}</h3>
                          {getStatusBadge(item.moderation_status)}
                          <Badge variant="outline" className="text-xs">
                            {item.content_type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Author: {item.user_profiles?.display_name || item.user_profiles?.email || "Unknown"}</span>
                          <span>Created: {format(new Date(item.created_at), "MMM dd, yyyy")}</span>
                          {item.flagged_at && (
                            <span className="text-orange-400">
                              Flagged: {format(new Date(item.flagged_at), "MMM dd, yyyy")}
                            </span>
                          )}
                          {item.reviewed_at && (
                            <span className="text-blue-400">
                              Reviewed: {format(new Date(item.reviewed_at), "MMM dd, yyyy")}
                            </span>
                          )}
                        </div>
                        {item.flag_reason && (
                          <div className="p-2 bg-orange-900/20 border border-orange-800 rounded text-sm">
                            <p className="font-medium text-orange-400 mb-1">Flag Reason:</p>
                            <p className="text-muted-foreground">{item.flag_reason}</p>
                          </div>
                        )}
                        {item.moderation_notes && (
                          <div className="p-2 bg-blue-900/20 border border-blue-800 rounded text-sm">
                            <p className="font-medium text-blue-400 mb-1">Moderation Notes:</p>
                            <p className="text-muted-foreground">{item.moderation_notes}</p>
                          </div>
                        )}
                        <div className="p-3 bg-gray-800 rounded text-sm max-h-32 overflow-y-auto">
                          <p className="text-muted-foreground line-clamp-3">{item.content}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReviewClick(item)}
                        className="border-gray-700"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Review
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Review Dialog */}
        <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
          <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl">
            <DialogHeader>
              <DialogTitle>Review Content</DialogTitle>
              <DialogDescription>
                {selectedContent && (
                  <>
                    Review content: {selectedContent.title}
                    {selectedContent.flag_reason && (
                      <div className="mt-2 p-2 bg-orange-900/20 border border-orange-800 rounded text-sm">
                        <p className="font-medium text-orange-400 mb-1">Flag Reason:</p>
                        <p className="text-muted-foreground">{selectedContent.flag_reason}</p>
                      </div>
                    )}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            {selectedContent && (
              <div className="space-y-4">
                <div className="p-4 bg-gray-800 rounded max-h-64 overflow-y-auto">
                  <p className="text-sm whitespace-pre-wrap">{selectedContent.content}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="review-status">Status</Label>
                  <Select value={reviewStatus} onValueChange={setReviewStatus}>
                    <SelectTrigger id="review-status" className="bg-gray-800 border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="pending">Pending Review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="review-notes">Moderation Notes (Optional)</Label>
                  <Textarea
                    id="review-notes"
                    placeholder="Add notes about your review decision..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="bg-gray-800 border-gray-700"
                    rows={3}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleReviewSubmit}
                disabled={reviewing !== null}
                className={reviewStatus === "approved" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
              >
                {reviewing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {reviewStatus === "approved" ? (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    ) : (
                      <XCircle className="mr-2 h-4 w-4" />
                    )}
                    {reviewStatus === "approved" ? "Approve" : "Reject"} Content
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

