"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Loader2, Upload } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function SentimentAnalysisPage() {
  const [text, setText] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [results, setResults] = useState<null | {
    sentiment: "positive" | "neutral" | "negative"
    score: number
  }>(null)
  const { toast } = useToast()

  const handleAnalyze = async () => {
    if (!text) {
      toast({
        title: "Missing text",
        description: "Please enter some text to analyze.",
        variant: "destructive",
      })
      return
    }

    setIsAnalyzing(true)

    try {
      const response = await fetch("/api/sentiment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to analyze sentiment")
      }

      const data = await response.json()

      setResults({
        sentiment: data.sentiment,
        score: data.score,
      })

      toast({
        title: "Analysis complete",
        description: "Sentiment analysis has been completed successfully.",
      })
    } catch (error) {
      console.error("Error analyzing sentiment:", error)
      toast({
        title: "Error analyzing sentiment",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Sentiment Analysis</h2>
          <p className="text-muted-foreground">
            Analyze customer reviews and feedback to understand sentiment and extract key insights.
          </p>
        </div>

        <Tabs defaultValue="text" className="space-y-4">
          <TabsList>
            <TabsTrigger value="text">Text Input</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="text">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle>Input Text</CardTitle>
                  <CardDescription>Enter the text you want to analyze for sentiment.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Paste customer reviews, feedback, or any text you want to analyze..."
                    className="min-h-[200px]"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                </CardContent>
                <CardFooter>
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

              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle>Analysis Results</CardTitle>
                  <CardDescription>Sentiment analysis results and key insights.</CardDescription>
                </CardHeader>
                <CardContent>
                  {results ? (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-sm font-medium mb-2">Overall Sentiment</h3>
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded-full ${
                              results.sentiment === "positive"
                                ? "bg-green-500"
                                : results.sentiment === "neutral"
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                            }`}
                          />
                          <span className="capitalize">{results.sentiment}</span>
                          <span className="ml-auto">{Math.round(results.score * 100)}%</span>
                        </div>
                        <Progress
                          value={results.score * 100}
                          className={`h-2 mt-2 ${
                            results.sentiment === "positive"
                              ? "bg-green-100"
                              : results.sentiment === "neutral"
                                ? "bg-yellow-100"
                                : "bg-red-100"
                          }`}
                        />
                      </div>

                      <div>
                        <h3 className="text-sm font-medium mb-2">Interpretation</h3>
                        <p className="text-sm text-muted-foreground">
                          {results.sentiment === "positive"
                            ? "The text expresses a positive sentiment, indicating satisfaction, approval, or optimism."
                            : results.sentiment === "negative"
                              ? "The text expresses a negative sentiment, indicating dissatisfaction, criticism, or pessimism."
                              : "The text expresses a neutral sentiment, without strong positive or negative indicators."}
                        </p>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium mb-2">Recommendations</h3>
                        <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
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
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[200px] text-center">
                      <p className="text-muted-foreground mb-2">
                        Enter text and click "Analyze Sentiment" to see results
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="bulk">
            <Card>
              <CardHeader>
                <CardTitle>Bulk Sentiment Analysis</CardTitle>
                <CardDescription>
                  Upload a CSV file with customer reviews or feedback for batch analysis.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12">
                  <Upload className="h-8 w-8 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Upload CSV File</h3>
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    Drag and drop your CSV file here, or click to browse
                  </p>
                  <Button variant="outline">Select File</Button>
                  <p className="text-xs text-muted-foreground mt-4">
                    CSV file should have a "text" column containing the content to analyze
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" disabled>
                  Upload and Analyze
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
