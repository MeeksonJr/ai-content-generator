"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Loader2, FileText, FolderKanban, BarChart3, ArrowRight, Plus, CreditCard } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { motion } from "framer-motion"

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState<any>(null)
  const [usageLimits, setUsageLimits] = useState<any>(null)
  const [usageStats, setUsageStats] = useState<any>(null)
  const [recentContent, setRecentContent] = useState<any[]>([])
  const [recentProjects, setRecentProjects] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // Fetch subscription data
      const subscriptionResponse = await fetch("/api/subscription")

      if (!subscriptionResponse.ok) {
        throw new Error("Failed to fetch subscription data")
      }

      const subscriptionData = await subscriptionResponse.json()
      setSubscription(subscriptionData.subscription)
      setUsageLimits(subscriptionData.usageLimits)
      setUsageStats(subscriptionData.usageStats)

      // Fetch recent content
      const { data: contentData, error: contentError } = await supabase
        .from("content")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5)

      if (contentError) {
        throw new Error("Failed to fetch recent content")
      }

      setRecentContent(contentData || [])

      // Fetch recent projects
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5)

      if (projectsError) {
        throw new Error("Failed to fetch recent projects")
      }

      setRecentProjects(projectsData || [])
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getUsagePercentage = (used: number, limit: number) => {
    if (!limit) return 0
    const percentage = (used / limit) * 100
    return Math.min(percentage, 100)
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
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Welcome to your AI Content Generator dashboard</p>
        </div>

        <motion.div
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Subscription Plan</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {subscription?.plan_type
                  ? subscription.plan_type.charAt(0).toUpperCase() + subscription.plan_type.slice(1)
                  : "Free"}
              </div>
              <p className="text-xs text-muted-foreground">
                {subscription?.status === "active" ? "Active subscription" : "Inactive subscription"}
              </p>
              <div className="mt-3">
                <Link href="/dashboard/subscription">
                  <Button variant="outline" size="sm" className="w-full border-gray-800 hover:bg-gray-800">
                    Manage Subscription
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Content Generated</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usageStats?.content_generated || 0}</div>
              <p className="text-xs text-muted-foreground">
                of {usageLimits?.monthly_content_limit || "∞"} available this month
              </p>
              <Progress
                value={getUsagePercentage(usageStats?.content_generated || 0, usageLimits?.monthly_content_limit || 0)}
                className="mt-3 h-1 bg-gray-800"
              />
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Projects</CardTitle>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{recentProjects.length}</div>
              <p className="text-xs text-muted-foreground">Total projects created</p>
              <div className="mt-3">
                <Link href="/dashboard/projects">
                  <Button variant="outline" size="sm" className="w-full border-gray-800 hover:bg-gray-800">
                    View Projects
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Analytics</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(usageStats?.sentiment_analysis_used || 0) +
                  (usageStats?.keyword_extraction_used || 0) +
                  (usageStats?.text_summarization_used || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Total AI analyses performed</p>
              <div className="mt-3">
                <Link href="/dashboard/analytics">
                  <Button variant="outline" size="sm" className="w-full border-gray-800 hover:bg-gray-800">
                    View Analytics
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <Tabs defaultValue="content" className="space-y-4">
          <TabsList className="bg-gray-900 border-gray-800">
            <TabsTrigger value="content">Recent Content</TabsTrigger>
            <TabsTrigger value="projects">Recent Projects</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Recent Content</h3>
              <Link href="/dashboard/generate">
                <Button size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  Create New
                </Button>
              </Link>
            </div>

            {recentContent.length > 0 ? (
              <div className="space-y-2">
                {recentContent.map((content) => (
                  <motion.div
                    key={content.id}
                    whileHover={{ y: -2 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <Link href={`/dashboard/content/${content.id}`}>
                      <Card className="bg-gray-900 border-gray-800 hover:bg-gray-800 hover:border-gray-700 transition-all cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{content.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {content.content.substring(0, 100)}...
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs border-gray-700">
                                  {content.content_type?.replace(/_/g, " ")}
                                </Badge>
                                {content.sentiment && (
                                  <Badge
                                    variant="outline"
                                    className={`text-xs border-gray-700 ${
                                      content.sentiment === "positive"
                                        ? "text-green-400"
                                        : content.sentiment === "negative"
                                          ? "text-red-400"
                                          : "text-yellow-400"
                                    }`}
                                  >
                                    {content.sentiment}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(content.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <p className="text-muted-foreground mb-4">No content generated yet</p>
                  <Link href="/dashboard/generate">
                    <Button>Generate Your First Content</Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {recentContent.length > 0 && (
              <div className="flex justify-center">
                <Link href="/dashboard/generate">
                  <Button variant="outline" className="border-gray-800 hover:bg-gray-800">
                    View All Content
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
          </TabsContent>

          <TabsContent value="projects" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Recent Projects</h3>
              <Link href="/dashboard/projects">
                <Button size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  Create New
                </Button>
              </Link>
            </div>

            {recentProjects.length > 0 ? (
              <div className="space-y-2">
                {recentProjects.map((project) => (
                  <motion.div
                    key={project.id}
                    whileHover={{ y: -2 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <Link href={`/dashboard/projects/${project.id}`}>
                      <Card className="bg-gray-900 border-gray-800 hover:bg-gray-800 hover:border-gray-700 transition-all cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{project.name}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {project.description || "No description"}
                              </p>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(project.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <p className="text-muted-foreground mb-4">No projects created yet</p>
                  <Link href="/dashboard/projects">
                    <Button>Create Your First Project</Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {recentProjects.length > 0 && (
              <div className="flex justify-center">
                <Link href="/dashboard/projects">
                  <Button variant="outline" className="border-gray-800 hover:bg-gray-800">
                    View All Projects
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
