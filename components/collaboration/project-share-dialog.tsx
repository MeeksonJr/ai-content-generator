"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, UserPlus, X, Share2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { format } from "date-fns"

type Share = {
  id: string
  shared_with_user_id: string
  shared_by_user_id: string
  permission: string
  created_at: string
  user_profiles: {
    display_name: string | null
    email: string | null
    avatar_url: string | null
  } | null
}

interface ProjectShareDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProjectShareDialog({ projectId, open, onOpenChange }: ProjectShareDialogProps) {
  const { toast } = useToast()
  const [shares, setShares] = useState<Share[]>([])
  const [loading, setLoading] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState("")
  const [permission, setPermission] = useState("view")
  const [userId, setUserId] = useState("")

  useEffect(() => {
    if (open && projectId) {
      fetchShares()
    }
  }, [open, projectId])

  const fetchShares = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/projects/${projectId}/share`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch shares")
      }

      const data = await response.json()
      setShares(data.shares || [])
    } catch (error) {
      console.error("Error fetching shares:", error)
      toast({
        title: "Error",
        description: "Failed to load project shares",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleShare = async () => {
    if (!userId && !userEmail) {
      toast({
        title: "Missing information",
        description: "Please provide either user ID or email",
        variant: "destructive",
      })
      return
    }

    try {
      setSharing(true)
      const response = await fetch(`/api/projects/${projectId}/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId || undefined,
          user_email: userEmail || undefined,
          permission,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to share project")
      }

      toast({
        title: "Project shared",
        description: "The project has been shared successfully",
      })

      setUserEmail("")
      setUserId("")
      setPermission("view")
      await fetchShares()
    } catch (error) {
      console.error("Error sharing project:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to share project",
        variant: "destructive",
      })
    } finally {
      setSharing(false)
    }
  }

  const handleRemoveShare = async (sharedWithUserId: string) => {
    try {
      setRemoving(sharedWithUserId)
      const response = await fetch(`/api/projects/${projectId}/share?user_id=${sharedWithUserId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to remove share")
      }

      toast({
        title: "Share removed",
        description: "The project share has been removed",
      })

      await fetchShares()
    } catch (error) {
      console.error("Error removing share:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove share",
        variant: "destructive",
      })
    } finally {
      setRemoving(null)
    }
  }

  const getPermissionBadgeVariant = (perm: string) => {
    switch (perm) {
      case "admin":
        return "default"
      case "edit":
        return "secondary"
      default:
        return "outline"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Project
          </DialogTitle>
          <DialogDescription>Share this project with team members</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Share Form */}
          <div className="space-y-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <h3 className="font-semibold">Add Team Member</h3>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="user-id">User ID</Label>
                <Input
                  id="user-id"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="bg-gray-900 border-gray-700"
                  placeholder="Enter user ID"
                />
                <p className="text-xs text-muted-foreground">
                  Note: Email lookup requires admin access. Please use User ID for now.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="permission">Permission</Label>
                <Select value={permission} onValueChange={setPermission}>
                  <SelectTrigger id="permission" className="bg-gray-900 border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">View (Read-only)</SelectItem>
                    <SelectItem value="edit">Edit (Can modify)</SelectItem>
                    <SelectItem value="admin">Admin (Full control)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleShare} disabled={sharing || (!userId && !userEmail)} className="w-full">
                {sharing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sharing...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Share Project
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Shared Users List */}
          <div className="space-y-4">
            <h3 className="font-semibold">Shared With</h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : shares.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No one has been shared with this project yet
              </p>
            ) : (
              <div className="space-y-2">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={share.user_profiles?.avatar_url || undefined} />
                        <AvatarFallback>
                          {share.user_profiles?.display_name?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {share.user_profiles?.display_name || share.user_profiles?.email || "Unknown User"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Shared {format(new Date(share.created_at), "MMM dd, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getPermissionBadgeVariant(share.permission)}>
                        {share.permission}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveShare(share.shared_with_user_id)}
                        disabled={removing === share.shared_with_user_id}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        {removing === share.shared_with_user_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

