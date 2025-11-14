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
        <motion.div variants={itemVariants}>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-3">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Text Summarization</h2>
                <p className="text-muted-foreground">
                  Automatically generate concise summaries from long-form content using AI.
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <motion.div
                variants={itemVariants}
                className="rounded-xl border border-gray-800 bg-gray-950 p-4"
                whileHover={{ y: -4 }}
              >
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Words Processed</span>
                  <BookMarked className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {wordCount.toLocaleString()}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Minimum 100 characters required for accurate summaries.
                </p>
              </motion.div>
              <motion.div
                variants={itemVariants}
                className="rounded-xl border border-gray-800 bg-gray-950 p-4"
                whileHover={{ y: -4 }}
              >
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Summary Length</span>
                  <span className="text-xs text-primary">{summaryLength} sentences</span>
                </div>
                <p className="mt-2 text-2xl font-semibold text-white capitalize">{summaryType}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {summaryType === "extractive"
                    ? "Extracts the most relevant sentences from the original text."
                    : "Generates paraphrased sentences based on the context."}
                </p>
              </motion.div>
              <motion.div
                variants={itemVariants}
                className="rounded-xl border border-gray-800 bg-gray-950 p-4"
                whileHover={{ y: -4 }}
              >
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Summary Output</span>
                  <span className="text-xs text-primary">{summaryWordCount} words</span>
                </div>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {summary ? "Ready" : "Pending"}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {summary
                    ? "Copy or download your summary instantly."
                    : "Generate a summary to preview the output."}
                </p>
              </motion.div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Tabs defaultValue="text" className="space-y-4">
            <TabsList className="bg-gray-900 border border-gray-800">
              <TabsTrigger value="text">Text Input</TabsTrigger>
              <TabsTrigger value="bulk">Bulk Summarization</TabsTrigger>
            </TabsList>

            <TabsContent value="text">
              <div className="grid gap-4 md:grid-cols-2">
                <motion.div variants={itemVariants} whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }}>
                  <Card className="md:col-span-1 border-gray-800 bg-gray-900">
                    <CardHeader>
                      <CardTitle>Input Text</CardTitle>
                      <CardDescription>Enter the text you want to summarize.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Textarea
                        placeholder="Paste your long-form content here (articles, reports, documents, etc.)..."
                        className="min-h-[300px] transition-all focus-visible:ring-2 focus-visible:ring-primary"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                      />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{text.length ? `${text.length} characters` : "Waiting for input..."}</span>
                        <span>{wordCount} words</span>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Summary Length: {summaryLength} sentences</Label>
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
                          <Label htmlFor="summary-type">Summary Type</Label>
                          <Select value={summaryType} onValueChange={setSummaryType}>
                            <SelectTrigger id="summary-type" className="bg-gray-950 border-gray-800">
                              <SelectValue placeholder="Select summary type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="extractive">Extractive (Key sentences)</SelectItem>
                              <SelectItem value="abstractive">Abstractive (Paraphrased)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex gap-2">
                      <Button variant="outline" onClick={resetForm} className="w-full border-gray-700">
                        Reset
                      </Button>
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
                </motion.div>

                <motion.div variants={itemVariants} whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }}>
                  <Card className="md:col-span-1 border-gray-800 bg-gray-900">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Summary</CardTitle>
                        {summary && (
                          <div className="flex gap-2">
                            <Button onClick={handleCopy} size="sm" variant="outline" className="border-gray-700">
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button onClick={handleDownload} size="sm" variant="outline" className="border-gray-700">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <CardDescription>AI-generated summary of your text.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-md border border-gray-800 bg-gray-950 p-4 text-sm min-h-[300px]">
                        <AnimatePresence mode="wait">
                          {isSummarizing ? (
                            <motion.div
                              key="loading"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="flex h-full items-center justify-center"
                            >
                              <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </motion.div>
                          ) : summary ? (
                            <motion.div
                              key="summary"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="whitespace-pre-wrap text-sm text-gray-200 space-y-4"
                            >
                              <p>{summary}</p>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
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
                              className="flex flex-col items-center justify-center h-full text-center text-muted-foreground"
                            >
                              <FileText className="h-12 w-12 mb-4 opacity-50" />
                              <p>Enter text and click "Summarize Text" to see results</p>
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
