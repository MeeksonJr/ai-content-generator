"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Loader2, Upload, Sparkles, TrendingUp, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { motion, AnimatePresence } from "framer-motion"

export default function SentimentAnalysisPage() {
  const [text, setText] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [results, setResults] = useState<null | {
    sentiment: "positive" | "neutral" | "negative"
    score: number
  }>(null)
  const { toast } = useToast()
  const [showRecommendations, setShowRecommendations] = useState(false)

  const handleAnalyze = async () => {
    if (!text.trim()) {
      toast({
        title: "Missing text",
        description: "Please enter some text to analyze.",
        variant: "destructive",
      })
      return
    }

    setIsAnalyzing(true)

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: text,
          analyzeSentiment: true,
          extractKeywords: false,
        }),
      })

      if (!response.ok) {
        let errorMessage = "Failed to analyze sentiment"
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (parseError) {
          // If response is not JSON, use fallback analysis
          console.warn("Response is not JSON, using fallback analysis")
          const fallbackResult = performFallbackSentimentAnalysis(text)
          setResults(fallbackResult)
          toast({
            title: "Analysis complete",
            description: "Sentiment analysis completed using fallback method.",
          })
          return
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()

      setResults({
        sentiment: data.sentiment || "neutral",
        score: data.sentimentScore || 0.5,
      })

      toast({
        title: "Analysis complete",
        description: "Sentiment analysis has been completed successfully.",
      })
    } catch (error) {
      console.error("Error analyzing sentiment:", error)

      // Use fallback sentiment analysis
      const fallbackResult = performFallbackSentimentAnalysis(text)
      setResults(fallbackResult)

      toast({
        title: "Analysis complete (fallback)",
        description: "Sentiment analysis completed using basic method due to service issues.",
        variant: "default",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const performFallbackSentimentAnalysis = (text: string) => {
    const lowerText = text.toLowerCase()

    const positiveWords = [
      "good",
      "great",
      "excellent",
      "amazing",
      "wonderful",
      "best",
      "love",
      "happy",
      "fantastic",
      "awesome",
      "brilliant",
      "perfect",
      "outstanding",
      "superb",
      "delighted",
      "pleased",
      "satisfied",
      "impressed",
      "remarkable",
    ]

    const negativeWords = [
      "bad",
      "worst",
      "terrible",
      "awful",
      "poor",
      "hate",
      "sad",
      "disappointed",
      "horrible",
      "disgusting",
      "pathetic",
      "useless",
      "annoying",
      "frustrating",
      "angry",
      "upset",
      "dissatisfied",
      "unimpressed",
      "dreadful",
    ]

    let positiveCount = 0
    let negativeCount = 0

    positiveWords.forEach((word) => {
      const regex = new RegExp(`\\b${word}\\b`, "g")
      const matches = lowerText.match(regex)
      if (matches) positiveCount += matches.length
    })

    negativeWords.forEach((word) => {
      const regex = new RegExp(`\\b${word}\\b`, "g")
      const matches = lowerText.match(regex)
      if (matches) negativeCount += matches.length
    })

    let sentiment: "positive" | "neutral" | "negative"
    let score: number

    if (positiveCount > negativeCount) {
      sentiment = "positive"
      score = Math.min(0.6 + (positiveCount - negativeCount) * 0.1, 0.95)
    } else if (negativeCount > positiveCount) {
      sentiment = "negative"
      score = Math.max(0.4 - (negativeCount - positiveCount) * 0.1, 0.05)
    } else {
      sentiment = "neutral"
      score = 0.5
    }

    return { sentiment, score }
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

  return (
    <DashboardLayout>
      <motion.div
        className="space-y-6"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div variants={itemVariants}>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-3">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Sentiment Analysis</h2>
                <p className="text-muted-foreground">
                  Analyze customer reviews and feedback to understand sentiment and extract key insights.
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <motion.div
                variants={itemVariants}
                className="rounded-lg border border-gray-800 bg-gray-950 p-4 shadow-inner"
                whileHover={{ y: -3 }}
              >
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Confidence</span>
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {results ? `${Math.round(results.score * 100)}%` : "--"}
                </p>
                <Progress value={results ? results.score * 100 : 0} className="mt-3 h-1.5 bg-gray-800" />
              </motion.div>
              <motion.div
                variants={itemVariants}
                className="rounded-lg border border-gray-800 bg-gray-950 p-4 shadow-inner"
                whileHover={{ y: -3 }}
              >
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Sentiment</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      results
                        ? results.sentiment === "positive"
                          ? "bg-green-900/30 text-green-300"
                          : results.sentiment === "negative"
                            ? "bg-red-900/30 text-red-300"
                            : "bg-yellow-900/30 text-yellow-300"
                        : "bg-gray-800 text-gray-400"
                    }`}
                  >
                    {results ? results.sentiment : "waiting"}
                  </span>
                </div>
                <p className="mt-2 text-2xl font-semibold text-white capitalize">
                  {results ? results.sentiment : "No data"}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {results
                    ? results.sentiment === "positive"
                      ? "Strong positive feedback detected."
                      : results.sentiment === "negative"
                        ? "Negative signals found."
                        : "Balanced feedback detected."
                    : "Run an analysis to see mood."}
                </p>
              </motion.div>
              <motion.div
                variants={itemVariants}
                className="rounded-lg border border-gray-800 bg-gray-950 p-4 shadow-inner"
                whileHover={{ y: -3 }}
              >
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Insights</span>
                  <AlertTriangle className="h-4 w-4 text-yellow-400" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {results ? (results.sentiment === "negative" ? "Action" : "Great") : "Idle"}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {results
                    ? results.sentiment === "negative"
                      ? "Review highlighted concerns."
                      : "Share positive experiences."
                    : "Awaiting input..."}
                </p>
              </motion.div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Tabs defaultValue="text" className="space-y-4">
            <TabsList className="bg-gray-900 border border-gray-800">
              <TabsTrigger value="text">Text Input</TabsTrigger>
              <TabsTrigger value="bulk">Bulk Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <motion.div
                  variants={itemVariants}
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  <Card className="md:col-span-1 h-full border-gray-800 bg-gray-900">
                    <CardHeader>
                      <CardTitle>Input Text</CardTitle>
                      <CardDescription>Enter the text you want to analyze for sentiment.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder="Paste customer reviews, feedback, or any text you want to analyze..."
                        className="min-h-[200px] transition-all focus-visible:ring-2 focus-visible:ring-primary"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                      />
                    </CardContent>
                    <CardFooter className="flex flex-col gap-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{text.length ? `${text.length} characters` : "Waiting for input..."}</span>
                        <span>{text.split(/\s+/).filter(Boolean).length} words</span>
                      </div>
                      <Button onClick={handleAnalyze} disabled={!text || isAnalyzing} className="w-full">
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          "Analyze Sentiment"
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>

                <motion.div
                  variants={itemVariants}
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  <Card className="md:col-span-1 h-full border-gray-800 bg-gray-900">
                    <CardHeader>
                      <CardTitle>Analysis Results</CardTitle>
                      <CardDescription>Sentiment analysis results and key insights.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <AnimatePresence mode="wait">
                        {results ? (
                          <motion.div
                            key="results"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                          >
                            <div>
                              <h3 className="text-sm font-medium mb-2 flex items-center justify-between">
                                Overall Sentiment
                                <span className="text-xs text-muted-foreground uppercase tracking-wide">
                                  {results.sentiment}
                                </span>
                              </h3>
                              <div className="flex items-center gap-2">
                                <motion.div
                                  layout
                                  className={`w-4 h-4 rounded-full ${
                                    results.sentiment === "positive"
                                      ? "bg-green-500"
                                      : results.sentiment === "neutral"
                                        ? "bg-yellow-500"
                                        : "bg-red-500"
                                  }`}
                                />
                                <span className="capitalize">{results.sentiment}</span>
                                <span className="ml-auto text-sm text-muted-foreground">
                                  Confidence {Math.round(results.score * 100)}%
                                </span>
                              </div>
                              <Progress value={results.score * 100} className="h-2 mt-2 bg-gray-800" />
                            </div>

                            <motion.div
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.1 }}
                              className="space-y-2"
                            >
                              <h3 className="text-sm font-medium mb-1">Interpretation</h3>
                              <p className="text-sm text-muted-foreground">
                                {results.sentiment === "positive"
                                  ? "The text expresses a positive sentiment, indicating satisfaction, approval, or optimism."
                                  : results.sentiment === "negative"
                                    ? "The text expresses a negative sentiment, indicating dissatisfaction, criticism, or pessimism."
                                    : "The text expresses a neutral sentiment, without strong positive or negative indicators."}
                              </p>
                            </motion.div>

                            <motion.div
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.2 }}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-medium">Recommendations</h3>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setShowRecommendations((prev) => !prev)}
                                  className="text-xs"
                                >
                                  {showRecommendations ? "Hide" : "Show"}
                                </Button>
                              </div>
                              <AnimatePresence initial={false}>
                                {showRecommendations && (
                                  <motion.ul
                                    key="recommendations"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="text-sm text-muted-foreground space-y-1 list-disc pl-4"
                                  >
                                    {results.sentiment === "positive" ? (
                                      <>
                                        <li>Highlight these positive aspects in marketing materials</li>
                                        <li>Consider featuring this as a testimonial</li>
                                        <li>Identify what's working well to replicate success</li>
                                      </>
                                    ) : results.sentiment === "negative" ? (
                                      <>
                                        <li>Address concerns raised in the feedback</li>
                                        <li>Follow up with the customer if possible</li>
                                        <li>Identify areas for product/service improvement</li>
                                      </>
                                    ) : (
                                      <>
                                        <li>Look for specific points that could be clarified</li>
                                        <li>Consider this feedback alongside other metrics</li>
                                        <li>Monitor for changes in sentiment over time</li>
                                      </>
                                    )}
                                  </motion.ul>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="empty"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex flex-col items-center justify-center h-[200px] text-center space-y-3 text-muted-foreground"
                          >
                            <Loader2 className="h-6 w-6 animate-spin text-primary/70" />
                            <div>
                              <p className="font-medium">Awaiting analysis</p>
                              <p className="text-sm">Enter text and run sentiment analysis to view results.</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
          </TabsContent>

          <TabsContent value="bulk">
            <motion.div variants={itemVariants}>
              <Card className="border-gray-800 bg-gray-900">
                <CardHeader>
                  <CardTitle>Bulk Sentiment Analysis</CardTitle>
                  <CardDescription>
                    Upload a CSV file with customer reviews or feedback for batch analysis.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <motion.div
                    variants={itemVariants}
                    className="flex flex-col items-center justify-center border-2 border-dashed border-gray-800 rounded-lg p-12 bg-gray-950"
                  >
                    <Upload className="h-8 w-8 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Upload CSV File</h3>
                    <p className="text-sm text-muted-foreground text-center mb-4">
                      Drag and drop your CSV file here, or click to browse
                    </p>
                    <Button variant="outline" disabled title="Coming soon">
                      Select File
                    </Button>
                    <p className="text-xs text-muted-foreground mt-4">
                      CSV file should have a "text" column containing the content to analyze
                    </p>
                  </motion.div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" disabled title="Coming soon">
                    Upload and Analyze
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  )
}
