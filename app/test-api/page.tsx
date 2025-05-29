"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function TestAPIPage() {
  const [result, setResult] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState("test topic")

  const testBlogAPI = async () => {
    try {
      setLoading(true)
      setResult("Testing...")

      console.log("Testing blog generate API...")

      const response = await fetch("/api/blog/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          searchQuery: query,
          forceRegenerate: false,
        }),
      })

      console.log("Response status:", response.status)
      console.log("Response headers:", Object.fromEntries(response.headers.entries()))

      const responseText = await response.text()
      console.log("Raw response:", responseText.substring(0, 500))

      if (!response.ok) {
        setResult(`Error ${response.status}: ${responseText}`)
        return
      }

      try {
        const data = JSON.parse(responseText)
        setResult(JSON.stringify(data, null, 2))
      } catch (parseError) {
        setResult(`JSON Parse Error: ${parseError}\n\nRaw response: ${responseText}`)
      }
    } catch (error) {
      console.error("Test error:", error)
      setResult(`Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const testSimpleAPI = async () => {
    try {
      setLoading(true)
      setResult("Testing simple API...")

      const response = await fetch("/api/test-blog")
      const data = await response.json()
      setResult(JSON.stringify(data, null, 2))
    } catch (error) {
      setResult(`Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">API Test Page</h1>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">Test Query:</label>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Enter test query" />
        </div>

        <div className="space-x-2">
          <Button onClick={testSimpleAPI} disabled={loading}>
            Test Simple API
          </Button>
          <Button onClick={testBlogAPI} disabled={loading}>
            Test Blog Generate API
          </Button>
        </div>
      </div>

      <div className="bg-gray-100 p-4 rounded">
        <h3 className="font-bold mb-2">Result:</h3>
        <pre className="whitespace-pre-wrap text-sm">{result}</pre>
      </div>
    </div>
  )
}
