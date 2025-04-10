"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Copy, Check, AlertCircle, Info } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"

export default function SummarizePage() {
  const [text, setText] = useState("")
  const [maxLength, setMaxLength] = useState(150)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const { toast } = useToast()

  const handleSummarize = async () => {
    if (!text) {
      toast({
        title: "Missing text",
        description: "Please enter some text to summarize.",
        variant: "destructive",
      })
      return
    }

    setIsSummarizing(true)
    setError(null)
    setWarning(null)

    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text, maxLength }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (
          data.error === "No active subscription" ||
          data.error === "Text summarization not available on your current plan"
        ) {
          setError("You need to upgrade your subscription to use text summarization.")
        } else {
          throw new Error(data.error || "Failed to summarize text")
        }
        return
      }

      setSummary(data.summary)

      // Check if we're using fallback summarization
      if (data.warning || data.error?.includes("fallback")) {
        setWarning("The AI service is currently experiencing high demand. We've provided a basic summary instead.")
      }

      toast({
        title: "Summarization complete",
        description: "Text has been successfully summarized.",
      })
    } catch (error) {
      console.error("Error summarizing text:", error)

      // Provide a more helpful error message
      let errorMessage = "An unknown error occurred"
      if (error instanceof Error) {
        errorMessage = error.message

        // Check for specific error patterns
        if (errorMessage.includes("503") || errorMessage.includes("unavailable")) {
          errorMessage = "The summarization service is temporarily unavailable. Please try again later."
        }
      }

      toast({
        title: "Error summarizing text",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSummarizing(false)
    }
  }

  const handleCopy = () => {
    if (!summary) return

    navigator.clipboard.writeText(summary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)

    toast({
      title: "Summary copied",
      description: "The summary has been copied to your clipboard.",
    })
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Text Summarization</h2>
          <p className="text-muted-foreground">
            Condense long articles, blog posts, or documents into concise summaries.
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error}{" "}
              {error.includes("subscription") && (
                <Link href="/dashboard/subscription" className="underline font-medium">
                  Go to subscription page
                </Link>
              )}
            </AlertDescription>
          </Alert>
        )}

        {warning && (
          <Alert variant="warning">
            <Info className="h-4 w-4" />
            <AlertTitle>Notice</AlertTitle>
            <AlertDescription>{warning}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Input Text</CardTitle>
              <CardDescription>Enter the text you want to summarize</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Paste your article, blog post, or any text you want to summarize..."
                className="min-h-[300px]"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <div className="flex items-center space-x-2">
                <Label htmlFor="max-length" className="flex-shrink-0">
                  Maximum Length:
                </Label>
                <Input
                  id="max-length"
                  type="number"
                  min={50}
                  max={500}
                  value={maxLength}
                  onChange={(e) => setMaxLength(Number.parseInt(e.target.value) || 150)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">characters</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSummarize} disabled={!text || isSummarizing} className="w-full">
                {isSummarizing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Summarizing...
                  </>
                ) : (
                  "Summarize Text"
                )}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Summary</span>
                {summary && (
                  <Button variant="ghost" size="sm" onClick={handleCopy} disabled={!summary}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                )}
              </CardTitle>
              <CardDescription>The condensed version of your text</CardDescription>
            </CardHeader>
            <CardContent>
              {summary ? (
                <div className="bg-muted p-4 rounded-md min-h-[200px]">
                  <p>{summary}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[200px] text-center">
                  <p className="text-muted-foreground mb-2">Enter text and click "Summarize Text" to see results</p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground">
                Text summarization uses AI to extract the most important information from your content.
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
