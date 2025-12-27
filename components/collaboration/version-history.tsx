"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Loader2, History, RotateCcw, Eye } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type Version = {
  id: string
  version_number: number
  title: string
  content: string
  change_summary: string | null
  created_at: string
  user_id: string
  user_profiles: {
    display_name: string | null
    email: string | null
    avatar_url: string | null
  } | null
}

interface VersionHistoryProps {
  contentId: string
  onRestore?: () => void
}

export function VersionHistory({ contentId, onRestore }: VersionHistoryProps) {
  const { toast } = useToast()
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(false)
  const [creatingVersion, setCreatingVersion] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)

  useEffect(() => {
    fetchVersions()
  }, [contentId])

  const fetchVersions = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/content/${contentId}/versions`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch versions")
      }

      const data = await response.json()
      setVersions(data.versions || [])
    } catch (error) {
      console.error("Error fetching versions:", error)
      toast({
        title: "Error",
        description: "Failed to load version history",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateVersion = async () => {
    try {
      setCreatingVersion(true)
      const response = await fetch(`/api/content/${contentId}/versions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          change_summary: "Manual snapshot",
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create version")
      }

      toast({
        title: "Version created",
        description: "A new version snapshot has been created",
      })

      await fetchVersions()
    } catch (error) {
      console.error("Error creating version:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create version",
        variant: "destructive",
      })
    } finally {
      setCreatingVersion(false)
    }
  }

  const handleRestore = async (versionId: string) => {
    if (!confirm("Are you sure you want to restore this version? The current content will be saved as a new version first.")) {
      return
    }

    try {
      setRestoring(versionId)
      const response = await fetch(`/api/content/${contentId}/versions/${versionId}/restore`, {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to restore version")
      }

      toast({
        title: "Version restored",
        description: "Content has been restored to this version",
      })

      if (onRestore) {
        onRestore()
      }
      await fetchVersions()
    } catch (error) {
      console.error("Error restoring version:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to restore version",
        variant: "destructive",
      })
    } finally {
      setRestoring(null)
    }
  }

  const handleViewVersion = (version: Version) => {
    setSelectedVersion(version)
    setViewDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Version History</h3>
          <span className="text-sm text-muted-foreground">({versions.length})</span>
        </div>
        <Button onClick={handleCreateVersion} disabled={creatingVersion} size="sm">
          {creatingVersion ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Snapshot"
          )}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : versions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No version history yet. Create a snapshot to track changes.
        </p>
      ) : (
        <div className="space-y-3">
          {versions.map((version) => (
            <Card key={version.id} className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={version.user_profiles?.avatar_url || undefined} />
                      <AvatarFallback>
                        {version.user_profiles?.display_name?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-sm flex items-center gap-2">
                        Version {version.version_number}
                        {version.version_number === versions[0]?.version_number && (
                          <Badge variant="outline" className="text-xs">Latest</Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {version.user_profiles?.display_name || version.user_profiles?.email || "Unknown User"} •{" "}
                        {format(new Date(version.created_at), "MMM dd, yyyy 'at' h:mm a")}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {version.change_summary && (
                  <p className="text-sm text-muted-foreground mb-3">{version.change_summary}</p>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewVersion(version)}
                    className="border-gray-700"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </Button>
                  {version.version_number !== versions[0]?.version_number && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(version.id)}
                      disabled={restoring === version.id}
                      className="border-gray-700"
                    >
                      {restoring === version.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Restoring...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Restore
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* View Version Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Version {selectedVersion?.version_number} - {selectedVersion?.title}
            </DialogTitle>
            <DialogDescription>
              Created {selectedVersion && format(new Date(selectedVersion.created_at), "MMM dd, yyyy 'at' h:mm a")}
            </DialogDescription>
          </DialogHeader>
          {selectedVersion && (
            <div className="space-y-4">
              {selectedVersion.change_summary && (
                <div className="p-3 bg-gray-800 rounded border border-gray-700">
                  <p className="text-sm font-medium mb-1">Change Summary</p>
                  <p className="text-sm text-muted-foreground">{selectedVersion.change_summary}</p>
                </div>
              )}
              <div className="p-4 bg-gray-800 rounded border border-gray-700">
                <p className="text-sm font-medium mb-2">Content</p>
                <pre className="text-sm whitespace-pre-wrap font-mono text-muted-foreground">
                  {selectedVersion.content}
                </pre>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

