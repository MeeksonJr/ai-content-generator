"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Users, FileText, Clock, CheckCircle, XCircle, Loader2, Eye, Brain, AlertCircle, Download } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

interface Application {
  id: string
  position_applied: string
  full_name: string
  email: string
  phone_number?: string
  cover_letter: string
  resume_url?: string
  status?: "pending" | "reviewed" | "accepted" | "rejected"
  created_at: string
  years_experience?: string
  linkedin_url?: string
  portfolio_url?: string
  ai_analysis?: {
    score: number
    strengths: string[]
    weaknesses: string[]
    recommendation: string
    keywords: string[]
    experienceLevel?: string
  }
  analyzed_at?: string
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchApplications()
  }, [])

  const fetchApplications = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase.from("applications").select("*").order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      // Ensure all applications have a status
      const processedData = ((data || []) as Application[]).map((app) => ({
        ...app,
        status: (app.status || "pending") as Application["status"], // Default to pending if status is missing
      }))

      setApplications(processedData)
    } catch (error) {
      console.error("Error fetching applications:", error)
      setError("Failed to load applications")
      toast({
        title: "Error",
        description: "Failed to load applications",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyzeResume = async (application: Application) => {
    try {
      setAnalyzingId(application.id)
      setError(null)

      console.log("Starting analysis for application:", application.id)

      const response = await fetch("/api/admin/analyze-resume", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          applicationId: application.id,
          resumeText: application.cover_letter,
        }),
      })

      console.log("Response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("API Error:", errorData)
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const result = await response.json()
      console.log("Analysis result:", result)

      if (!result.success) {
        throw new Error(result.error || "Analysis failed")
      }

      // Update the local state
      setApplications((prev) =>
        prev.map((app) =>
          app.id === application.id
            ? {
                ...app,
                ai_analysis: result.analysis,
                analyzed_at: new Date().toISOString(),
              }
            : app,
        ),
      )

      toast({
        title: "Analysis Complete",
        description: "Resume has been analyzed successfully",
      })
    } catch (error) {
      console.error("Error analyzing resume:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to analyze resume"
      setError(errorMessage)
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setAnalyzingId(null)
    }
  }

  const updateApplicationStatus = async (id: string, status: Application["status"]) => {
    try {
      const { error } = await supabase
        .from("applications")
        // @ts-ignore - Known Supabase type inference issue with update operations
        .update({ status })
        .eq("id", id)

      if (error) {
        throw error
      }

      setApplications((prev) => prev.map((app) => (app.id === id ? { ...app, status } : app)))

      toast({
        title: "Status Updated",
        description: `Application status changed to ${status}`,
      })
    } catch (error) {
      console.error("Error updating status:", error)
      toast({
        title: "Error",
        description: "Failed to update application status",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: string | undefined) => {
    // Default to pending if status is undefined
    const safeStatus = status || "pending"

    const variants = {
      pending: "bg-yellow-900/20 text-yellow-400 border-yellow-800",
      reviewed: "bg-blue-900/20 text-blue-400 border-blue-800",
      accepted: "bg-green-900/20 text-green-400 border-green-800",
      rejected: "bg-red-900/20 text-red-400 border-red-800",
    }

    const icons = {
      pending: Clock,
      reviewed: Eye,
      accepted: CheckCircle,
      rejected: XCircle,
    }

    // Use the safe status to get the icon, defaulting to Clock if not found
    const Icon = icons[safeStatus as keyof typeof icons] || Clock
    const variant = variants[safeStatus as keyof typeof variants] || variants.pending

    return (
      <Badge variant="outline" className={variant}>
        <Icon className="w-3 h-3 mr-1" />
        {safeStatus.charAt(0).toUpperCase() + safeStatus.slice(1)}
      </Badge>
    )
  }

  const stats = {
    total: applications.length,
    pending: applications.filter((app) => app.status === "pending").length,
    reviewed: applications.filter((app) => app.status === "reviewed").length,
    accepted: applications.filter((app) => app.status === "accepted").length,
    rejected: applications.filter((app) => app.status === "rejected").length,
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
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Job Applications</h2>
          <p className="text-muted-foreground">Manage and review job applications</p>
        </div>

        {error && (
          <Card className="bg-red-900/20 border-red-800">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <p className="text-red-400">{error}</p>
                <Button onClick={fetchApplications} size="sm" variant="outline" className="ml-auto border-red-700">
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-yellow-400" />
                <div>
                  <p className="text-sm font-medium">Pending</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Eye className="h-4 w-4 text-blue-400" />
                <div>
                  <p className="text-sm font-medium">Reviewed</p>
                  <p className="text-2xl font-bold">{stats.reviewed}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <div>
                  <p className="text-sm font-medium">Accepted</p>
                  <p className="text-2xl font-bold">{stats.accepted}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <XCircle className="h-4 w-4 text-red-400" />
                <div>
                  <p className="text-sm font-medium">Rejected</p>
                  <p className="text-2xl font-bold">{stats.rejected}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Applications List */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle>Applications</CardTitle>
            <CardDescription>Review and manage job applications</CardDescription>
          </CardHeader>
          <CardContent>
            {applications.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No applications yet</h3>
                <p className="text-muted-foreground">Applications will appear here when submitted</p>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((application) => (
                  <Card key={application.id} className="bg-gray-800 border-gray-700">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-3">
                            <h3 className="font-medium">{application.full_name}</h3>
                            {getStatusBadge(application.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">Position: {application.position_applied}</p>
                          <p className="text-sm text-muted-foreground">
                            Email: {application.email} | Phone: {application.phone_number || "N/A"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Applied: {new Date(application.created_at).toLocaleDateString()}
                          </p>
                          {application.resume_url && (
                            <div className="mt-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline" className="border-gray-700">
                                    <FileText className="h-4 w-4 mr-2" />
                                    View Resume
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle>Resume - {application.full_name}</DialogTitle>
                                    <DialogDescription>
                                      Resume for {application.position_applied} position
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="mt-4">
                                    {application.resume_url.endsWith(".pdf") || application.resume_url.includes(".pdf") ? (
                                      <div className="space-y-4">
                                        <div className="flex justify-end">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => window.open(application.resume_url, "_blank")}
                                          >
                                            <Download className="h-4 w-4 mr-2" />
                                            Download PDF
                                          </Button>
                                        </div>
                                        <div className="border border-gray-800 rounded-lg overflow-hidden bg-gray-900" style={{ height: "70vh" }}>
                                          <iframe
                                            src={`${application.resume_url}#toolbar=0`}
                                            className="w-full h-full"
                                            title="Resume PDF Preview"
                                            onError={(e) => {
                                              const iframe = e.target as HTMLIFrameElement
                                              const parent = iframe.parentElement
                                              if (parent) {
                                                parent.innerHTML = `
                                                  <div class="p-8 text-center h-full flex flex-col items-center justify-center">
                                                    <FileText class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                                    <p class="text-sm text-muted-foreground mb-4">Unable to preview this PDF</p>
                                                    <a href="${application.resume_url}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">
                                                      Open in new tab
                                                    </a>
                                                  </div>
                                                `
                                              }
                                            }}
                                          />
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="space-y-4">
                                        <div className="flex justify-end">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => window.open(application.resume_url, "_blank")}
                                          >
                                            <Download className="h-4 w-4 mr-2" />
                                            Download Resume
                                          </Button>
                                        </div>
                                        {/* Image Preview */}
                                        <div className="border border-gray-800 rounded-lg overflow-hidden bg-gray-900">
                                          <img
                                            src={application.resume_url}
                                            alt={`Resume for ${application.full_name}`}
                                            className="w-full h-auto max-h-[70vh] object-contain"
                                            onError={(e) => {
                                              // If image fails to load, show fallback
                                              const target = e.target as HTMLImageElement
                                              target.style.display = "none"
                                              const parent = target.parentElement
                                              if (parent) {
                                                parent.innerHTML = `
                                                  <div class="p-8 text-center">
                                                    <FileText class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                                    <p class="text-sm text-muted-foreground mb-4">Unable to preview this file</p>
                                                    <a href="${application.resume_url}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">
                                                      Open in new tab
                                                    </a>
                                                  </div>
                                                `
                                              }
                                            }}
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          )}

                          {application.ai_analysis && (
                            <div className="mt-3 p-3 bg-gray-900 rounded-lg">
                              <div className="flex items-center space-x-2 mb-2">
                                <Brain className="h-4 w-4 text-purple-400" />
                                <span className="text-sm font-medium">AI Analysis</span>
                                <Badge variant="outline" className="bg-purple-900/20 text-purple-400 border-purple-800">
                                  Score: {application.ai_analysis.score}/100
                                </Badge>
                                {application.ai_analysis.experienceLevel && (
                                  <Badge variant="outline" className="bg-blue-900/20 text-blue-400 border-blue-800">
                                    {application.ai_analysis.experienceLevel}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                <strong>Recommendation:</strong> {application.ai_analysis.recommendation}
                              </p>
                              <div className="grid md:grid-cols-2 gap-3 text-xs">
                                <div>
                                  <strong className="text-green-400">Strengths:</strong>
                                  <ul className="list-disc list-inside text-muted-foreground">
                                    {application.ai_analysis.strengths.map((strength, idx) => (
                                      <li key={idx}>{strength}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <strong className="text-yellow-400">Areas for improvement:</strong>
                                  <ul className="list-disc list-inside text-muted-foreground">
                                    {application.ai_analysis.weaknesses.map((weakness, idx) => (
                                      <li key={idx}>{weakness}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                              {application.ai_analysis.keywords.length > 0 && (
                                <div className="mt-2">
                                  <strong className="text-blue-400 text-xs">Keywords:</strong>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {application.ai_analysis.keywords.map((keyword, idx) => (
                                      <Badge key={idx} variant="secondary" className="text-xs">
                                        {keyword}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col space-y-2">
                          <Button
                            onClick={() => handleAnalyzeResume(application)}
                            disabled={analyzingId === application.id}
                            size="sm"
                            variant="outline"
                            className="border-gray-700"
                          >
                            {analyzingId === application.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Analyzing...
                              </>
                            ) : (
                              <>
                                <Brain className="h-4 w-4 mr-2" />
                                {application.ai_analysis ? "Re-analyze" : "Analyze"}
                              </>
                            )}
                          </Button>

                          <div className="flex space-x-2">
                            {(!application.status || application.status === "pending") && (
                              <>
                                <Button
                                  onClick={() => updateApplicationStatus(application.id, "accepted")}
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  Accept
                                </Button>
                                <Button
                                  onClick={() => updateApplicationStatus(application.id, "rejected")}
                                  size="sm"
                                  variant="destructive"
                                >
                                  Reject
                                </Button>
                              </>
                            )}

                            {application.status && application.status !== "pending" && (
                              <Button
                                onClick={() => updateApplicationStatus(application.id, "pending")}
                                size="sm"
                                variant="outline"
                                className="border-gray-700"
                              >
                                Reset
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {application.cover_letter && (
                        <div className="mt-4 p-3 bg-gray-900 rounded-lg">
                          <h4 className="text-sm font-medium mb-2">Cover Letter:</h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {application.cover_letter}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
