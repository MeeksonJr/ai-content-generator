"use client"

import type React from "react"

import { useState, useRef } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Upload, Copy, Download, FileText, X, Sparkles, BookMarked } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { motion, AnimatePresence } from "framer-motion"

export default function SummarizePage() {
  const [text, setText] = useState("")
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [summary, setSummary] = useState("")
  const [summaryLength, setSummaryLength] = useState(3) // Number of sentences
  const [summaryType, setSummaryType] = useState("extractive")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [bulkResults, setBulkResults] = useState<any[]>([])
  const [processingBulk, setProcessingBulk] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const [showSummaryTips, setShowSummaryTips] = useState(true)

  const handleSummarize = async () => {
    if (!text.trim()) {
      toast({
        title: "Missing text",
        description: "Please enter some text to summarize.",
        variant: "destructive",
      })
      return
    }

    if (text.trim().length < 100) {
      toast({
        title: "Text too short",
        description: "Please enter at least 100 characters for meaningful summarization.",
        variant: "destructive",
      })
      return
    }

    setIsSummarizing(true)

    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text,
          maxSentences: summaryLength,
          type: summaryType,
        }),
      })

      if (!response.ok) {
        let errorMessage = "Failed to summarize text"
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (parseError) {
          // If response is not JSON, use fallback summarization
          console.warn("Response is not JSON, using fallback summarization")
          const fallbackSummary = performFallbackSummarization(text, summaryLength)
          setSummary(fallbackSummary)
          toast({
            title: "Summarization complete",
            description: "Text summarized using fallback method.",
          })
          return
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()

      setSummary(data.summary || "")

      toast({
        title: "Summarization complete",
        description: "Text has been summarized successfully.",
      })
    } catch (error) {
      console.error("Error summarizing text:", error)

      // Use fallback summarization
      const fallbackSummary = performFallbackSummarization(text, summaryLength)
      setSummary(fallbackSummary)

      toast({
        title: "Summarization complete (fallback)",
        description: "Text summarized using basic method due to service issues.",
        variant: "default",
      })
    } finally {
      setIsSummarizing(false)
    }
  }

  const performFallbackSummarization = (text: string, maxSentences: number): string => {
    // Simple extractive summarization
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10)

    if (sentences.length <= maxSentences) {
      return text
    }

    // Score sentences based on word frequency and position
    const words = text
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 3)
    const wordFreq: Record<string, number> = {}

    words.forEach((word) => {
      wordFreq[word] = (wordFreq[word] || 0) + 1
    })

    const sentenceScores = sentences.map((sentence, index) => {
      const sentenceWords = sentence
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 3)
      let score = 0

      sentenceWords.forEach((word) => {
        score += wordFreq[word] || 0
      })

      // Boost score for sentences at the beginning
      if (index < sentences.length * 0.3) {
        score *= 1.5
      }

      return { sentence: sentence.trim(), score, index }
    })

    // Select top sentences
    const topSentences = sentenceScores
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSentences)
      .sort((a, b) => a.index - b.index)
      .map((item) => item.sentence)

    return topSentences.join(". ") + "."
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        setUploadedFile(file)
        toast({
          title: "File uploaded",
          description: `${file.name} has been uploaded successfully.`,
        })
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a CSV file.",
          variant: "destructive",
        })
        // Reset the input
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      }
    }
  }

  const handleBulkSummarization = async () => {
    if (!uploadedFile) {
      toast({
        title: "No file selected",
        description: "Please upload a CSV file first.",
        variant: "destructive",
      })
      return
    }

    setProcessingBulk(true)
    setBulkResults([])

    try {
      const fileContent = await uploadedFile.text()
      const lines = fileContent.split("\n").filter((line) => line.trim())

      if (lines.length < 2) {
        throw new Error("CSV file must have at least a header and one data row")
      }

      // Parse CSV headers more robustly
      const headers = lines[0].split(",").map((h) =>
        h
          .trim()
          .replace(/^["']|["']$/g, "")
          .toLowerCase(),
      )

      console.log("CSV Headers found:", headers)

      // Look for text column with more flexible matching
      const textColumnIndex = headers.findIndex(
        (h) =>
          h.includes("text") ||
          h.includes("content") ||
          h.includes("description") ||
          h.includes("message") ||
          h.includes("body"),
      )

      if (textColumnIndex === -1) {
        throw new Error(
          `CSV file must have a column containing 'text', 'content', 'description', 'message', or 'body' in the header. Found headers: ${headers.join(", ")}`,
        )
      }

      console.log(`Using column index ${textColumnIndex} (${headers[textColumnIndex]}) for text content`)

      const results = []

      for (let i = 1; i < Math.min(lines.length, 11); i++) {
        // Parse CSV row more robustly
        const row = []
        let currentField = ""
        let inQuotes = false

        for (let j = 0; j < lines[i].length; j++) {
          const char = lines[i][j]

          if (char === '"' && (j === 0 || lines[i][j - 1] === ",")) {
            inQuotes = true
          } else if (char === '"' && inQuotes && (j === lines[i].length - 1 || lines[i][j + 1] === ",")) {
            inQuotes = false
          } else if (char === "," && !inQuotes) {
            row.push(currentField.trim())
            currentField = ""
          } else {
            currentField += char
          }
        }

        // Add the last field
        row.push(currentField.trim())

        const textToSummarize = row[textColumnIndex]

        if (textToSummarize && textToSummarize.length > 50) {
          const summary = performFallbackSummarization(textToSummarize, summaryLength)
          results.push({
            id: i,
            originalText: textToSummarize.substring(0, 100) + "...",
            summary: summary,
          })
        }
      }

      setBulkResults(results)
      toast({
        title: "Bulk summarization complete",
        description: `Processed ${results.length} text entries.`,
      })
    } catch (error) {
      console.error("Error processing bulk summarization:", error)
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "Failed to process CSV file.",
        variant: "destructive",
      })
    } finally {
      setProcessingBulk(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(summary)
    toast({
      title: "Copied",
      description: "Summary copied to clipboard",
    })
  }

  const handleDownload = () => {
    const blob = new Blob([summary], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `summary-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDownloadBulkResults = () => {
    const csvContent = [
      "ID,Original Text,Summary",
      ...bulkResults.map((result) => `${result.id},"${result.originalText}","${result.summary}"`),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `bulk-summaries-${Date.now()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const resetForm = () => {
    setText("")
    setSummary("")
    setSummaryLength(3)
    setSummaryType("extractive")
  }

  const removeFile = () => {
    setUploadedFile(null)
    setBulkResults([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
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
      transition: { duration: 0.4 },
    },
  }

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0
  const summaryWordCount = summary.trim() ? summary.trim().split(/\s+/).length : 0

  return (
    <DashboardLayout>
      <motion.div
        className="space-y-6"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div variants={itemVariants} className="space-y-4 sm:space-y-6">
          <div className="flex flex-col gap-4 sm:gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="rounded-full bg-primary/10 border border-primary/20 p-3 sm:p-4">
                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div className="space-y-1 sm:space-y-2">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">Text Summarization</h2>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Automatically generate concise summaries from long-form content using AI.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <motion.div
                variants={itemVariants}
                className="rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-950 p-4 sm:p-5 shadow-lg hover:shadow-xl hover:shadow-primary/10 transition-all"
                whileHover={{ y: -4, scale: 1.02 }}
              >
                <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground mb-3">
                  <span>Words Processed</span>
                  <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                    <BookMarked className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  {wordCount.toLocaleString()}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Minimum 100 characters required for accurate summaries.
                </p>
              </motion.div>
              <motion.div
                variants={itemVariants}
                className="rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-950 p-4 sm:p-5 shadow-lg hover:shadow-xl hover:shadow-primary/10 transition-all"
                whileHover={{ y: -4, scale: 1.02 }}
              >
                <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground mb-3">
                  <span>Summary Length</span>
                  <span className="text-xs font-medium text-primary px-2 py-1 rounded-md bg-primary/10 border border-primary/20">
                    {summaryLength} sentences
                  </span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-white capitalize mb-2">{summaryType}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {summaryType === "extractive"
                    ? "Extracts the most relevant sentences from the original text."
                    : "Generates paraphrased sentences based on the context."}
                </p>
              </motion.div>
              <motion.div
                variants={itemVariants}
                className="rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-950 p-4 sm:p-5 shadow-lg hover:shadow-xl hover:shadow-primary/10 transition-all"
                whileHover={{ y: -4, scale: 1.02 }}
              >
                <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground mb-3">
                  <span>Summary Output</span>
                  <span className="text-xs font-medium text-primary px-2 py-1 rounded-md bg-primary/10 border border-primary/20">
                    {summaryWordCount} words
                  </span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  {summary ? "Ready" : "Pending"}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {summary
                    ? "Copy or download your summary instantly."
                    : "Generate a summary to preview the output."}
                </p>
              </motion.div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Tabs defaultValue="text" className="space-y-4 sm:space-y-6">
            <TabsList className="bg-gray-900 border border-gray-800 w-full sm:w-auto flex-wrap">
              <TabsTrigger value="text" className="text-xs sm:text-sm px-3 sm:px-4">Text Input</TabsTrigger>
              <TabsTrigger value="bulk" className="text-xs sm:text-sm px-3 sm:px-4">Bulk Summarization</TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="space-y-4 sm:space-y-6">
              <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
                <motion.div variants={itemVariants} whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }}>
                  <Card className="border-gray-800 bg-gradient-to-br from-gray-900 to-gray-950 shadow-lg">
                    <CardHeader className="pb-3 sm:pb-4">
                      <CardTitle className="text-base sm:text-lg">Input Text</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Enter the text you want to summarize.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 sm:space-y-5">
                      <Textarea
                        placeholder="Paste your long-form content here (articles, reports, documents, etc.)..."
                        className="min-h-[250px] sm:min-h-[300px] transition-all focus-visible:ring-2 focus-visible:ring-primary text-sm resize-none"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                      />
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-gray-800">
                        <span>{text.length ? `${text.length} characters` : "Waiting for input..."}</span>
                        <span>{wordCount} words</span>
                      </div>

                      <div className="space-y-4 sm:space-y-5">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs sm:text-sm">Summary Length</Label>
                            <span className="text-xs font-medium text-primary">{summaryLength} sentences</span>
                          </div>
                          <Slider
                            value={[summaryLength]}
                            onValueChange={(value) => setSummaryLength(value[0])}
                            max={10}
                            min={1}
                            step={1}
                            className="w-full"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="summary-type" className="text-xs sm:text-sm">Summary Type</Label>
                          <Select value={summaryType} onValueChange={setSummaryType}>
                            <SelectTrigger id="summary-type" className="bg-gray-950 border-gray-800 h-9 sm:h-10 text-sm">
                              <SelectValue placeholder="Select summary type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="extractive" className="text-sm">Extractive (Key sentences)</SelectItem>
                              <SelectItem value="abstractive" className="text-sm">Abstractive (Paraphrased)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex flex-col sm:flex-row gap-2 pt-4">
                      <Button 
                        variant="outline" 
                        onClick={resetForm} 
                        className="w-full sm:w-auto h-9 sm:h-10 border-gray-700 hover:bg-gray-800"
                      >
                        Reset
                      </Button>
                      <Button 
                        onClick={handleSummarize} 
                        disabled={!text || isSummarizing} 
                        className="w-full sm:w-auto h-9 sm:h-10 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90"
                      >
                        {isSummarizing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            <span className="hidden sm:inline">Summarizing...</span>
                            <span className="sm:hidden">Summarizing</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            <span className="hidden sm:inline">Summarize Text</span>
                            <span className="sm:hidden">Summarize</span>
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>

                <motion.div variants={itemVariants} whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }}>
                  <Card className="border-gray-800 bg-gradient-to-br from-gray-900 to-gray-950 shadow-lg">
                    <CardHeader className="pb-3 sm:pb-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                        <div>
                          <CardTitle className="text-base sm:text-lg">Summary</CardTitle>
                          <CardDescription className="text-xs sm:text-sm">
                            AI-generated summary of your text.
                          </CardDescription>
                        </div>
                        {summary && (
                          <div className="flex gap-2 w-full sm:w-auto">
                            <Button 
                              onClick={handleCopy} 
                              size="sm" 
                              variant="outline" 
                              className="border-gray-700 hover:bg-gray-800 h-9 flex-1 sm:flex-initial"
                            >
                              <Copy className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                              <span className="text-xs sm:text-sm">Copy</span>
                            </Button>
                            <Button 
                              onClick={handleDownload} 
                              size="sm" 
                              variant="outline" 
                              className="border-gray-700 hover:bg-gray-800 h-9 flex-1 sm:flex-initial"
                            >
                              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                              <span className="text-xs sm:text-sm">Download</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 sm:space-y-4">
                      <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-3 sm:p-4 text-sm min-h-[250px] sm:min-h-[300px]">
                        <AnimatePresence mode="wait">
                          {isSummarizing ? (
                            <motion.div
                              key="loading"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="flex flex-col h-full items-center justify-center space-y-4"
                            >
                              <div className="relative">
                                <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-primary" />
                                <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-primary animate-pulse absolute inset-0 m-auto" />
                              </div>
                              <div className="text-center space-y-2">
                                <p className="text-sm sm:text-base font-medium text-white">Summarizing text...</p>
                                <p className="text-xs sm:text-sm text-muted-foreground">This may take a few moments</p>
                              </div>
                            </motion.div>
                          ) : summary ? (
                            <motion.div
                              key="summary"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="whitespace-pre-wrap text-xs sm:text-sm text-gray-200 space-y-4 leading-relaxed"
                            >
                              <p>{summary}</p>
                              <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-gray-700">
                                <span>{summary.length} characters</span>
                                <span>{summaryWordCount} words</span>
                              </div>
                            </motion.div>
                          ) : (
                            <motion.div
                              key="empty"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="flex flex-col items-center justify-center h-full text-center text-muted-foreground space-y-3"
                            >
                              <div className="p-4 rounded-full bg-gray-800 border border-gray-700">
                                <FileText className="h-8 w-8 sm:h-10 sm:w-10 text-gray-600" />
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm sm:text-base font-medium">No summary yet</p>
                                <p className="text-xs sm:text-sm">Enter text and click "Summarize Text" to see results</p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <AnimatePresence initial={false}>
                        {showSummaryTips && summary && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="rounded-md border border-gray-800 bg-gray-950 p-3 text-xs text-muted-foreground"
                          >
                            <p className="font-medium text-white mb-1">Improve this summary</p>
                            <ul className="list-disc pl-4 space-y-1">
                              <li>Adjust the length slider to refine detail level.</li>
                              <li>Switch to abstractive mode for paraphrased output.</li>
                              <li>Run multiple variations and combine the best insights.</li>
                            </ul>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                    {summary && (
                      <CardFooter>
                        <div className="w-full text-sm text-muted-foreground">
                          <p>Original: {text.length} characters</p>
                          <p>Summary: {summary.length} characters</p>
                          <p>
                            Compression:{" "}
                            {text.length
                              ? Math.max(0, Math.round((1 - summary.length / text.length) * 100))
                              : 0}
                            %
                          </p>
                        </div>
                      </CardFooter>
                    )}
                  </Card>
                </motion.div>
              </div>
            </TabsContent>

            <TabsContent value="bulk">
              <motion.div variants={itemVariants} className="space-y-6">
                <Card className="border-gray-800 bg-gray-900">
                  <CardHeader>
                    <CardTitle>Bulk Text Summarization</CardTitle>
                    <CardDescription>Upload a CSV file with text content for batch summarization.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!uploadedFile ? (
                      <motion.div
                        className="flex flex-col items-center justify-center border-2 border-dashed border-gray-700 rounded-lg p-12 cursor-pointer hover:bg-gray-950 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                        onDrop={(e) => {
                          e.preventDefault()
                          const files = e.dataTransfer.files
                          if (files.length > 0) {
                            const file = files[0]
                            if (file.type === "text/csv" || file.name.endsWith(".csv")) {
                              setUploadedFile(file)
                              toast({
                                title: "File uploaded",
                                description: `${file.name} has been uploaded successfully.`,
                              })
                            } else {
                              toast({
                                title: "Invalid file type",
                                description: "Please upload a CSV file.",
                                variant: "destructive",
                              })
                            }
                          }
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDragEnter={(e) => e.preventDefault()}
                      >
                        <Upload className="h-8 w-8 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2 text-white">Upload CSV File</h3>
                        <p className="text-sm text-muted-foreground text-center mb-4">
                          Drag and drop your CSV file here, or click to browse
                        </p>
                        <Button variant="outline" className="border-gray-700 text-white" disabled>
                          Select File
                        </Button>
                        <p className="text-xs text-muted-foreground mt-4">
                          CSV file should have a "text" column containing the content to summarize
                        </p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv,text/csv"
                          onChange={handleFileUpload}
                          className="hidden"
                          aria-label="Upload CSV file for bulk summarization"
                        />
                      </motion.div>
                    ) : (
                      <div className="flex items-center justify-between p-4 border border-gray-800 rounded-lg bg-gray-950">
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-primary" />
                          <div>
                            <p className="font-medium text-white">{uploadedFile.name}</p>
                            <p className="text-sm text-muted-foreground">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={removeFile}
                          className="text-muted-foreground hover:text-white"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      onClick={handleBulkSummarization}
                      disabled={!uploadedFile || processingBulk}
                    >
                      {processingBulk ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Upload and Summarize"
                      )}
                    </Button>
                  </CardFooter>
                </Card>

                <AnimatePresence>
                  {bulkResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <Card className="border-gray-800 bg-gray-900">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle>Bulk Results</CardTitle>
                            <Button onClick={handleDownloadBulkResults} size="sm" variant="outline">
                              <Download className="h-4 w-4 mr-2" />
                              Download CSV
                            </Button>
                          </div>
                          <CardDescription>Summarization results for your uploaded file.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4 max-h-[400px] overflow-auto">
                            {bulkResults.map((result) => (
                              <motion.div
                                key={result.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="border border-gray-800 rounded-lg p-4 bg-gray-950"
                              >
                                <div className="grid gap-2 text-sm">
                                  <div>
                                    <Label className="text-xs font-medium text-muted-foreground">Original Text</Label>
                                    <p className="text-muted-foreground">{result.originalText}</p>
                                  </div>
                                  <div>
                                    <Label className="text-xs font-medium text-muted-foreground">Summary</Label>
                                    <p className="text-white font-medium">{result.summary}</p>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  )
}
