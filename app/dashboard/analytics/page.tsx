"use client"

import { useState, useEffect, useMemo } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, BarChart3, FileText, MessageSquare, Tag, Download, RefreshCw } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Treemap,
} from "recharts"
import { motion } from "framer-motion"

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [subscription, setSubscription] = useState<any>(null)
  const [usageLimits, setUsageLimits] = useState<any>(null)
  const [usageStats, setUsageStats] = useState<any>(null)
  const [contentStats, setContentStats] = useState<any>(null)
  const [sentimentStats, setSentimentStats] = useState<any>(null)
  const [keywordStats, setKeywordStats] = useState<any>(null)
  const [contentTypeStats, setContentTypeStats] = useState<any>(null)
  const [contentHistory, setContentHistory] = useState<any>(null)
  const [timeRange, setTimeRange] = useState("all")
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchAnalyticsData()
  }, [])

  const fetchAnalyticsData = async () => {
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

      // Fetch content statistics
      const { data: contentData, error: contentError } = await supabase
        .from("content")
        .select("id, content_type, sentiment, created_at, keywords")

      if (contentError) {
        throw contentError
      }

      // Process content type statistics
      const contentTypeCount: Record<string, number> = {}
      contentData.forEach((item: any) => {
        const type = item.content_type
        contentTypeCount[type] = (contentTypeCount[type] || 0) + 1
      })

      const contentTypeData = Object.entries(contentTypeCount).map(([name, value]) => ({
        name: name
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" "),
        value,
      }))

      setContentTypeStats(contentTypeData)

      // Process sentiment statistics
      const sentimentCount: Record<string, number> = { positive: 0, negative: 0, neutral: 0 }
      contentData.forEach((item: any) => {
        if (item.sentiment) {
          sentimentCount[item.sentiment] = (sentimentCount[item.sentiment] || 0) + 1
        }
      })

      const sentimentData = Object.entries(sentimentCount).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }))

      setSentimentStats(sentimentData)

      // Process content history (by month)
      const contentByMonth: Record<string, number> = {}
      contentData.forEach((item: any) => {
        const date = new Date(item.created_at)
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        contentByMonth[monthYear] = (contentByMonth[monthYear] || 0) + 1
      })

      // Sort by month
      const sortedMonths = Object.keys(contentByMonth).sort()
      const contentHistoryData = sortedMonths.map((month) => {
        const [year, monthNum] = month.split("-")
        const date = new Date(Number.parseInt(year), Number.parseInt(monthNum) - 1)
        return {
          month: date.toLocaleString("default", { month: "short", year: "numeric" }),
          count: contentByMonth[month],
        }
      })

      setContentHistory(contentHistoryData)

      // Process keyword statistics
      const keywordCount: Record<string, number> = {}
      contentData.forEach((item: any) => {
        if (item.keywords && Array.isArray(item.keywords)) {
          item.keywords.forEach((keyword: string) => {
            keywordCount[keyword] = (keywordCount[keyword] || 0) + 1
          })
        }
      })

      // Get top 10 keywords
      const keywordEntries = Object.entries(keywordCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
      const keywordStatsData = keywordEntries.map(([name, value]) => ({ name, value }))

      setKeywordStats(keywordStatsData)

      // Set overall content stats
      setContentStats({
        total: contentData.length,
        types: Object.keys(contentTypeCount).length,
        withSentiment: Object.values(sentimentCount).reduce((a, b) => a + b, 0),
        withKeywords: contentData.filter((item: any) => item.keywords && item.keywords.length > 0).length,
      })
    } catch (error) {
      console.error("Error fetching analytics data:", error)
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const refreshData = async () => {
    try {
      setRefreshing(true)
      await fetchAnalyticsData()
      toast({
        title: "Data refreshed",
        description: "Analytics data has been updated",
      })
    } catch (error) {
      console.error("Error refreshing data:", error)
      toast({
        title: "Error",
        description: "Failed to refresh analytics data",
        variant: "destructive",
      })
    } finally {
      setRefreshing(false)
    }
  }

  const downloadCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return

    const headers = Object.keys(data[0])
    const csvRows = [
      headers.join(","),
      ...data.map((row) => headers.map((header) => JSON.stringify(row[header] || "")).join(",")),
    ]
    const csvString = csvRows.join("\n")
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `${filename}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredContentHistory = useMemo(() => {
    if (!contentHistory) return []

    if (timeRange === "all") return contentHistory

    const now = new Date()
    const months = timeRange === "3m" ? 3 : timeRange === "6m" ? 6 : 12
    const cutoffDate = new Date(now.getFullYear(), now.getMonth() - months, 1)

    return contentHistory.filter((item: any) => {
      const [month, year] = item.month.split(" ")
      const date = new Date(`${month} 1, ${year}`)
      return date >= cutoffDate
    })
  }, [contentHistory, timeRange])

  const COLORS = [
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff8042",
    "#0088fe",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#a4de6c",
    "#d0ed57",
  ]

  const SENTIMENT_COLORS = {
    Positive: "#4ade80",
    Neutral: "#facc15",
    Negative: "#f87171",
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
            <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
            <p className="text-muted-foreground">View insights and statistics about your content</p>
          </div>
          <Button variant="outline" size="sm" onClick={refreshData} disabled={refreshing} className="border-gray-800">
            {refreshing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Data
              </>
            )}
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Content</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{contentStats?.total || 0}</div>
                <p className="text-xs text-muted-foreground">Pieces of content generated</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Content Types</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{contentStats?.types || 0}</div>
                <p className="text-xs text-muted-foreground">Different content types used</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sentiment Analysis</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{contentStats?.withSentiment || 0}</div>
                <p className="text-xs text-muted-foreground">Content pieces analyzed</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Keyword Extraction</CardTitle>
                <Tag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{contentStats?.withKeywords || 0}</div>
                <p className="text-xs text-muted-foreground">Content with extracted keywords</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <Tabs defaultValue="content" className="space-y-4">
          <TabsList className="bg-gray-900 border-gray-800">
            <TabsTrigger value="content">Content Analytics</TabsTrigger>
            <TabsTrigger value="sentiment">Sentiment Analysis</TabsTrigger>
            <TabsTrigger value="keywords">Keyword Analytics</TabsTrigger>
            <TabsTrigger value="usage">Usage Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="flex items-center justify-between">
                  <div>
                    <CardTitle>Content by Type</CardTitle>
                    <CardDescription>Distribution of content across different types</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-800"
                    onClick={() => downloadCSV(contentTypeStats || [], "content-by-type")}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {contentTypeStats && contentTypeStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={contentTypeStats}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {contentTypeStats.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: "#333", borderColor: "#555" }}
                          itemStyle={{ color: "#fff" }}
                          formatter={(value: any) => [`${value} pieces`, "Count"]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      No content type data available
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="flex items-center justify-between">
                  <div>
                    <CardTitle>Content Creation Over Time</CardTitle>
                    <CardDescription>Number of content pieces created per month</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center space-x-1">
                      <select
                        className="bg-gray-800 border-gray-700 rounded-md text-xs px-2 py-1"
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                      >
                        <option value="3m">Last 3 months</option>
                        <option value="6m">Last 6 months</option>
                        <option value="12m">Last 12 months</option>
                        <option value="all">All time</option>
                      </select>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-800"
                      onClick={() => downloadCSV(filteredContentHistory || [], "content-over-time")}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {filteredContentHistory && filteredContentHistory.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={filteredContentHistory}>
                        <defs>
                          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                        <XAxis dataKey="month" stroke="#888" />
                        <YAxis stroke="#888" />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#333", borderColor: "#555" }}
                          itemStyle={{ color: "#fff" }}
                          formatter={(value: any) => [`${value} pieces`, "Content Created"]}
                        />
                        <Area
                          type="monotone"
                          dataKey="count"
                          name="Content Created"
                          stroke="#8884d8"
                          fillOpacity={1}
                          fill="url(#colorCount)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      No content history data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sentiment" className="space-y-4">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="flex items-center justify-between">
                <div>
                  <CardTitle>Sentiment Distribution</CardTitle>
                  <CardDescription>Distribution of sentiment across your content</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-800"
                  onClick={() => downloadCSV(sentimentStats || [], "sentiment-distribution")}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent className="h-[400px]">
                {sentimentStats && sentimentStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sentimentStats}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={150}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {sentimentStats.map((entry: any, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              SENTIMENT_COLORS[entry.name as keyof typeof SENTIMENT_COLORS] ||
                              COLORS[index % COLORS.length]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "#333", borderColor: "#555" }}
                        itemStyle={{ color: "#fff" }}
                        formatter={(value: any) => [`${value} pieces`, "Count"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    No sentiment data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Sentiment Insights</CardTitle>
                <CardDescription>Key insights from sentiment analysis</CardDescription>
              </CardHeader>
              <CardContent>
                {sentimentStats && sentimentStats.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card className="bg-gray-800 border-gray-700">
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold mb-1">
                            {sentimentStats.find((s: any) => s.name === "Positive")?.value || 0}
                          </div>
                          <div className="text-sm font-medium text-green-400">Positive</div>
                        </CardContent>
                      </Card>
                      <Card className="bg-gray-800 border-gray-700">
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold mb-1">
                            {sentimentStats.find((s: any) => s.name === "Neutral")?.value || 0}
                          </div>
                          <div className="text-sm font-medium text-yellow-400">Neutral</div>
                        </CardContent>
                      </Card>
                      <Card className="bg-gray-800 border-gray-700">
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold mb-1">
                            {sentimentStats.find((s: any) => s.name === "Negative")?.value || 0}
                          </div>
                          <div className="text-sm font-medium text-red-400">Negative</div>
                        </CardContent>
                      </Card>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium mb-2">Sentiment Trends</h3>
                      <p className="text-muted-foreground">
                        {sentimentStats.find((s: any) => s.name === "Positive")?.value >
                        sentimentStats.find((s: any) => s.name === "Negative")?.value
                          ? "Your content tends to have a positive sentiment, which is great for engaging your audience."
                          : "Your content has more negative sentiment than positive. Consider adjusting your tone for better audience engagement."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    No sentiment data available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="keywords" className="space-y-4">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="flex items-center justify-between">
                <div>
                  <CardTitle>Top Keywords</CardTitle>
                  <CardDescription>Most frequently extracted keywords from your content</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-800"
                  onClick={() => downloadCSV(keywordStats || [], "top-keywords")}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent className="h-[400px]">
                {keywordStats && keywordStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={keywordStats} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                      <XAxis type="number" stroke="#888" />
                      <YAxis dataKey="name" type="category" stroke="#888" width={120} tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#333", borderColor: "#555" }}
                        itemStyle={{ color: "#fff" }}
                        formatter={(value: any) => [`${value} occurrences`, "Frequency"]}
                      />
                      <Bar dataKey="value" name="Frequency" radius={[0, 4, 4, 0]}>
                        {keywordStats.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    No keyword data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Keyword Visualization</CardTitle>
                <CardDescription>Visual representation of your most common keywords</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {keywordStats && keywordStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <Treemap data={keywordStats} dataKey="value" nameKey="name" stroke="#333" fill="#8884d8">
                      {keywordStats.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                      <Tooltip
                        contentStyle={{ backgroundColor: "#333", borderColor: "#555" }}
                        itemStyle={{ color: "#fff" }}
                        formatter={(value: any) => [`${value} occurrences`, "Frequency"]}
                      />
                    </Treemap>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                    No keyword data available
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <div className="flex flex-wrap gap-2 justify-center w-full">
                  {keywordStats &&
                    keywordStats.slice(0, 5).map((keyword: any, index: number) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="text-base py-2 px-3"
                        style={{
                          fontSize: `${Math.max(1, Math.min(2, 1 + keyword.value / 5))}rem`,
                          backgroundColor: `${COLORS[index % COLORS.length]}20`,
                          borderColor: COLORS[index % COLORS.length],
                          color: COLORS[index % COLORS.length],
                        }}
                      >
                        {keyword.name}
                      </Badge>
                    ))}
                </div>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="usage" className="space-y-4">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Usage Statistics</CardTitle>
                <CardDescription>Your current usage and limits</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <div className="text-sm font-medium">Content Generation</div>
                      <div className="text-sm text-muted-foreground">
                        {usageStats?.content_generated || 0} / {usageLimits?.monthly_content_limit || "∞"}
                      </div>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{
                          width: `${Math.min(
                            100,
                            ((usageStats?.content_generated || 0) / (usageLimits?.monthly_content_limit || 1)) * 100,
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <div className="text-sm font-medium">Sentiment Analysis</div>
                      <div className="text-sm text-muted-foreground">
                        {usageStats?.sentiment_analysis_used || 0} uses
                      </div>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{
                          width: `${Math.min(100, ((usageStats?.sentiment_analysis_used || 0) / 100) * 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <div className="text-sm font-medium">Keyword Extraction</div>
                      <div className="text-sm text-muted-foreground">
                        {usageStats?.keyword_extraction_used || 0} uses
                      </div>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{
                          width: `${Math.min(100, ((usageStats?.keyword_extraction_used || 0) / 100) * 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <div className="text-sm font-medium">Text Summarization</div>
                      <div className="text-sm text-muted-foreground">
                        {usageStats?.text_summarization_used || 0} uses
                      </div>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500"
                        style={{
                          width: `${Math.min(100, ((usageStats?.text_summarization_used || 0) / 100) * 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  {subscription?.plan_type === "enterprise" && (
                    <div>
                      <div className="flex justify-between mb-2">
                        <div className="text-sm font-medium">API Calls</div>
                        <div className="text-sm text-muted-foreground">{usageStats?.api_calls || 0} calls</div>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-500"
                          style={{
                            width: `${Math.min(100, ((usageStats?.api_calls || 0) / 1000) * 100)}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Subscription Details</CardTitle>
                <CardDescription>Your current plan and features</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">Current Plan</div>
                      <div className="text-muted-foreground">
                        {subscription?.plan_type
                          ? subscription.plan_type.charAt(0).toUpperCase() + subscription.plan_type.slice(1)
                          : "Free"}
                      </div>
                    </div>
                    <Badge
                      variant={subscription?.status === "active" ? "default" : "destructive"}
                      className="text-xs py-1"
                    >
                      {subscription?.status
                        ? subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)
                        : "Inactive"}
                    </Badge>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="font-medium">Content Limit</div>
                      <div className="text-muted-foreground">{usageLimits?.monthly_content_limit || "∞"} per month</div>
                    </div>
                    <div>
                      <div className="font-medium">Max Content Length</div>
                      <div className="text-muted-foreground">{usageLimits?.max_content_length || 0} characters</div>
                    </div>
                    <div>
                      <div className="font-medium">Features</div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Badge
                          variant="outline"
                          className={
                            usageLimits?.sentiment_analysis_enabled
                              ? "bg-green-900/20 text-green-400 border-green-800"
                              : "bg-gray-800 text-gray-400 border-gray-700"
                          }
                        >
                          Sentiment Analysis
                        </Badge>
                        <Badge
                          variant="outline"
                          className={
                            usageLimits?.keyword_extraction_enabled
                              ? "bg-green-900/20 text-green-400 border-green-800"
                              : "bg-gray-800 text-gray-400 border-gray-700"
                          }
                        >
                          Keyword Extraction
                        </Badge>
                        <Badge
                          variant="outline"
                          className={
                            usageLimits?.text_summarization_enabled
                              ? "bg-green-900/20 text-green-400 border-green-800"
                              : "bg-gray-800 text-gray-400 border-gray-700"
                          }
                        >
                          Text Summarization
                        </Badge>
                        <Badge
                          variant="outline"
                          className={
                            usageLimits?.api_access_enabled
                              ? "bg-green-900/20 text-green-400 border-green-800"
                              : "bg-gray-800 text-gray-400 border-gray-700"
                          }
                        >
                          API Access
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">Started On</div>
                      <div className="text-muted-foreground">
                        {subscription?.started_at ? new Date(subscription.started_at).toLocaleDateString() : "N/A"}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
