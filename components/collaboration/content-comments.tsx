"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, MessageSquare, Send, Edit, Trash2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/client"

type Comment = {
  id: string
  user_id: string
  comment_text: string
  parent_comment_id: string | null
  created_at: string
  updated_at: string
  user_profiles: {
    display_name: string | null
    email: string | null
    avatar_url: string | null
  } | null
}

interface ContentCommentsProps {
  contentId: string
}

export function ContentComments({ contentId }: ContentCommentsProps) {
  const { toast } = useToast()
  const supabase = createClient()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")
  const [newComment, setNewComment] = useState("")
  const [deleting, setDeleting] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    }
    getCurrentUser()
    fetchComments()
  }, [contentId])

  const fetchComments = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/content/${contentId}/comments`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch comments")
      }

      const data = await response.json()
      setComments(data.comments || [])
    } catch (error) {
      console.error("Error fetching comments:", error)
      toast({
        title: "Error",
        description: "Failed to load comments",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitComment = async () => {
    if (!newComment.trim()) {
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch(`/api/content/${contentId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          comment_text: newComment,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to post comment")
      }

      toast({
        title: "Comment posted",
        description: "Your comment has been added",
      })

      setNewComment("")
      await fetchComments()
    } catch (error) {
      console.error("Error posting comment:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to post comment",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateComment = async (commentId: string) => {
    if (!editText.trim()) {
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch(`/api/content/${contentId}/comments/${commentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          comment_text: editText,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update comment")
      }

      toast({
        title: "Comment updated",
        description: "Your comment has been updated",
      })

      setEditingId(null)
      setEditText("")
      await fetchComments()
    } catch (error) {
      console.error("Error updating comment:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update comment",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) {
      return
    }

    try {
      setDeleting(commentId)
      const response = await fetch(`/api/content/${contentId}/comments/${commentId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete comment")
      }

      toast({
        title: "Comment deleted",
        description: "Your comment has been deleted",
      })

      await fetchComments()
    } catch (error) {
      console.error("Error deleting comment:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete comment",
        variant: "destructive",
      })
    } finally {
      setDeleting(null)
    }
  }

  const startEdit = (comment: Comment) => {
    setEditingId(comment.id)
    setEditText(comment.comment_text)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditText("")
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Comments</h3>
        <span className="text-sm text-muted-foreground">({comments.length})</span>
      </div>

      {/* Add Comment */}
      <div className="space-y-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="bg-gray-800 border-gray-700 min-h-[100px]"
          placeholder="Add a comment..."
        />
        <div className="flex justify-end">
          <Button onClick={handleSubmitComment} disabled={submitting || !newComment.trim()}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Posting...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Post Comment
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Comments List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No comments yet. Be the first to comment!
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="p-4 bg-gray-800 rounded-lg border border-gray-700 space-y-3"
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={comment.user_profiles?.avatar_url || undefined} />
                  <AvatarFallback>
                    {comment.user_profiles?.display_name?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        {comment.user_profiles?.display_name || comment.user_profiles?.email || "Unknown User"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(comment.created_at), "MMM dd, yyyy 'at' h:mm a")}
                        {comment.updated_at !== comment.created_at && " (edited)"}
                      </p>
                    </div>
                    {comment.user_id === currentUserId && (
                      <div className="flex items-center gap-2">
                        {editingId === comment.id ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUpdateComment(comment.id)}
                              disabled={submitting}
                            >
                              Save
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelEdit}
                              disabled={submitting}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEdit(comment)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteComment(comment.id)}
                              disabled={deleting === comment.id}
                              className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                            >
                              {deleting === comment.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  {editingId === comment.id ? (
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="bg-gray-900 border-gray-700"
                      rows={3}
                    />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{comment.comment_text}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

