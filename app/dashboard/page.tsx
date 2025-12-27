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
import { Skeleton } from "@/components/ui/skeleton"
import { createClient } from "@/lib/supabase/client"
import { motion } from "framer-motion"
import { SkeletonCard } from "@/components/dashboard/skeleton-card"
import type { SubscriptionRow, UsageLimitRow, UsageStatsRow, ContentRow, ProjectRow } from "@/lib/types/dashboard.types"

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null)
  const [usageLimits, setUsageLimits] = useState<UsageLimitRow | null>(null)
  const [usageStats, setUsageStats] = useState<UsageStatsRow | null>(null)
  const [recentContent, setRecentContent] = useState<ContentRow[]>([])
  const [recentProjects, setRecentProjects] = useState<ProjectRow[]>([])
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
      },
    },
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 sm:space-y-8">
          <div className="space-y-3">
            <Skeleton className="h-8 sm:h-9 w-48 sm:w-64 bg-gray-800 rounded" />
            <Skeleton className="h-4 sm:h-5 w-64 sm:w-80 bg-gray-800 rounded" />
          </div>
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <div className="space-y-4">
            <Skeleton className="h-10 w-32 bg-gray-800 rounded" />
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full bg-gray-800 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <motion.div
        className="space-y-6 sm:space-y-8"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div variants={itemVariants} className="space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                Dashboard
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base mt-1 sm:mt-2">
                Welcome back! Here's an overview of your content generation activity.
              </p>
            </div>
            <Link href="/dashboard/generate">
              <Button size="sm" className="gap-2 h-9 sm:h-10">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Generate Content</span>
                <span className="sm:hidden">Generate</span>
              </Button>
            </Link>
          </div>
        </motion.div>

        <motion.div
          className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
          variants={containerVariants}
        >
          <motion.div variants={itemVariants}>
            <Card className="bg-gradient-to-br from-gray-900 to-gray-950 border-gray-800 hover:border-primary/50 transition-all duration-300 group hover:shadow-lg hover:shadow-primary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium">Subscription Plan</CardTitle>
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-2xl sm:text-3xl font-bold">
                {subscription?.plan_type
                  ? subscription.plan_type.charAt(0).toUpperCase() + subscription.plan_type.slice(1)
                  : "Free"}
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${subscription?.status === "active" ? "bg-green-500" : "bg-gray-500"}`}></div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {subscription?.status === "active" ? "Active subscription" : "Inactive subscription"}
                </p>
              </div>
              <div className="pt-2">
                <Link href="/dashboard/subscription">
                  <Button variant="outline" size="sm" className="w-full border-gray-800 hover:bg-gray-800 hover:border-primary/50 h-9 text-xs sm:text-sm">
                    Manage Subscription
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="bg-gradient-to-br from-gray-900 to-gray-950 border-gray-800 hover:border-primary/50 transition-all duration-300 group hover:shadow-lg hover:shadow-primary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium">Content Generated</CardTitle>
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-2xl sm:text-3xl font-bold">{usageStats?.content_generated || 0}</div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                of {usageLimits?.monthly_content_limit || "∞"} available this month
              </p>
              <div className="space-y-1.5">
                <Progress
                  value={getUsagePercentage(usageStats?.content_generated || 0, usageLimits?.monthly_content_limit || 0)}
                  className="h-2 bg-gray-800"
                />
                <p className="text-xs text-muted-foreground">
                  {usageLimits?.monthly_content_limit 
                    ? `${Math.max(0, (usageLimits.monthly_content_limit || 0) - (usageStats?.content_generated || 0))} remaining`
                    : "Unlimited"}
                </p>
              </div>
            </CardContent>
          </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="bg-gradient-to-br from-gray-900 to-gray-950 border-gray-800 hover:border-primary/50 transition-all duration-300 group hover:shadow-lg hover:shadow-primary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium">Projects</CardTitle>
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                <FolderKanban className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-2xl sm:text-3xl font-bold">{recentProjects.length}</div>
              <p className="text-xs sm:text-sm text-muted-foreground">Total projects created</p>
              <div className="pt-2">
                <Link href="/dashboard/projects">
                  <Button variant="outline" size="sm" className="w-full border-gray-800 hover:bg-gray-800 hover:border-primary/50 h-9 text-xs sm:text-sm">
                    View Projects
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="bg-gradient-to-br from-gray-900 to-gray-950 border-gray-800 hover:border-primary/50 transition-all duration-300 group hover:shadow-lg hover:shadow-primary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium">Analytics</CardTitle>
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-2xl sm:text-3xl font-bold">
                {(usageStats?.sentiment_analysis_used || 0) +
                  (usageStats?.keyword_extraction_used || 0) +
                  (usageStats?.text_summarization_used || 0)}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">Total AI analyses performed</p>
              <div className="pt-2">
                <Link href="/dashboard/analytics">
                  <Button variant="outline" size="sm" className="w-full border-gray-800 hover:bg-gray-800 hover:border-primary/50 h-9 text-xs sm:text-sm">
                    View Analytics
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
          </motion.div>
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-4 sm:space-y-6">
        <Tabs defaultValue="content" className="space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <TabsList className="bg-gray-900 border-gray-800">
              <TabsTrigger value="content" className="text-xs sm:text-sm">Recent Content</TabsTrigger>
              <TabsTrigger value="projects" className="text-xs sm:text-sm">Recent Projects</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="content" className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
              <div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold">Recent Content</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Your latest generated content items
                </p>
              </div>
              <Link href="/dashboard/generate">
                <Button size="sm" className="gap-1.5 h-9 sm:h-10 w-full sm:w-auto">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Create New</span>
                  <span className="sm:hidden">New</span>
                </Button>
              </Link>
            </div>

            {recentContent.length > 0 ? (
              <motion.div
                className="space-y-3 sm:space-y-4"
                variants={containerVariants}
              >
                {recentContent.map((content, index) => (
                  <motion.div
                    key={content.id}
                    variants={itemVariants}
                    whileHover={{ y: -4, scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <Link href={`/dashboard/content/${content.id}`}>
                      <Card className="bg-gradient-to-br from-gray-900 to-gray-950 border-gray-800 hover:bg-gray-800 hover:border-primary/50 transition-all duration-300 cursor-pointer group">
                        <CardContent className="p-4 sm:p-5">
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-2 sm:gap-3 mb-2">
                                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary mt-0.5 flex-shrink-0" />
                                <h4 className="font-semibold text-sm sm:text-base group-hover:text-primary transition-colors line-clamp-2">
                                  {content.title || "Untitled Content"}
                                </h4>
                              </div>
                              <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 line-clamp-2 sm:line-clamp-3">
                                {content.content.substring(0, 120)}...
                              </p>
                              <div className="flex flex-wrap items-center gap-2 mt-3">
                                <Badge variant="outline" className="text-xs border-gray-700 bg-gray-800/50">
                                  {content.content_type?.replace(/_/g, " ") || "Content"}
                                </Badge>
                                {content.sentiment && (
                                  <Badge
                                    variant="outline"
                                    className={`text-xs border-gray-700 ${
                                      content.sentiment === "positive"
                                        ? "text-green-400 border-green-400/30 bg-green-400/10"
                                        : content.sentiment === "negative"
                                          ? "text-red-400 border-red-400/30 bg-red-400/10"
                                          : "text-yellow-400 border-yellow-400/30 bg-yellow-400/10"
                                    }`}
                                  >
                                    {content.sentiment}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                              {new Date(content.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <Card className="bg-gradient-to-br from-gray-900 to-gray-950 border-gray-800">
                <CardContent className="flex flex-col items-center justify-center p-8 sm:p-12 text-center">
                  <div className="p-4 rounded-full bg-primary/10 border border-primary/20 mb-4">
                    <FileText className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                  </div>
                  <h4 className="text-lg sm:text-xl font-semibold mb-2">No content generated yet</h4>
                  <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                    Start creating amazing content with our AI-powered generator
                  </p>
                  <Link href="/dashboard/generate">
                    <Button className="gap-2 h-10 sm:h-11">
                      <Plus className="h-4 w-4" />
                      Generate Your First Content
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {recentContent.length > 0 && (
              <div className="flex justify-center pt-2">
                <Link href="/dashboard/generate">
                  <Button variant="outline" className="border-gray-800 hover:bg-gray-800 hover:border-primary/50 h-9 sm:h-10">
                    View All Content
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
          </TabsContent>

          <TabsContent value="projects" className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
              <div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold">Recent Projects</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Your latest content organization projects
                </p>
              </div>
              <Link href="/dashboard/projects">
                <Button size="sm" className="gap-1.5 h-9 sm:h-10 w-full sm:w-auto">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Create New</span>
                  <span className="sm:hidden">New</span>
                </Button>
              </Link>
            </div>

            {recentProjects.length > 0 ? (
              <motion.div className="space-y-3 sm:space-y-4" variants={containerVariants}>
                {recentProjects.map((project, index) => (
                  <motion.div
                    key={project.id}
                    variants={itemVariants}
                    whileHover={{ y: -4, scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <Link href={`/dashboard/projects/${project.id}`}>
                      <Card className="bg-gradient-to-br from-gray-900 to-gray-950 border-gray-800 hover:bg-gray-800 hover:border-primary/50 transition-all duration-300 cursor-pointer group">
                        <CardContent className="p-4 sm:p-5">
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-2 sm:gap-3 mb-2">
                                <FolderKanban className="h-4 w-4 sm:h-5 sm:w-5 text-primary mt-0.5 flex-shrink-0" />
                                <h4 className="font-semibold text-sm sm:text-base group-hover:text-primary transition-colors">
                                  {project.name}
                                </h4>
                              </div>
                              <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 line-clamp-2">
                                {project.description || "No description provided"}
                              </p>
                            </div>
                            <div className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                              {new Date(project.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <Card className="bg-gradient-to-br from-gray-900 to-gray-950 border-gray-800">
                <CardContent className="flex flex-col items-center justify-center p-8 sm:p-12 text-center">
                  <div className="p-4 rounded-full bg-primary/10 border border-primary/20 mb-4">
                    <FolderKanban className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                  </div>
                  <h4 className="text-lg sm:text-xl font-semibold mb-2">No projects created yet</h4>
                  <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                    Organize your content into projects for better workflow management
                  </p>
                  <Link href="/dashboard/projects">
                    <Button className="gap-2 h-10 sm:h-11">
                      <Plus className="h-4 w-4" />
                      Create Your First Project
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {recentProjects.length > 0 && (
              <div className="flex justify-center pt-2">
                <Link href="/dashboard/projects">
                  <Button variant="outline" className="border-gray-800 hover:bg-gray-800 hover:border-primary/50 h-9 sm:h-10">
                    View All Projects
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
          </TabsContent>
        </Tabs>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  )
}
