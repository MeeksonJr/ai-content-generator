"use client"

import type React from "react"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Sparkles, Calendar, Search, Clock, Eye, Tag, RefreshCw, FileText, Loader2 } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface BlogPost {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string
  search_query: string
  category: string
  author: string
  image_url?: string
  image_prompt?: string
  tags: string[]
  read_time: string
  view_count: number
  created_at: string
  ai_provider: string
}

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [blogPost, setBlogPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const query = searchParams.get("q") || ""

  useEffect(() => {
    console.log("Search page loaded with query:", query)
    setSearchQuery(query)
    if (query && query.trim() && query !== "search") {
      console.log("Auto-triggering search for:", query)
      handleSearch(query)
    }
  }, [query])

  const handleSearch = async (searchTerm: string) => {
    console.log("handleSearch called with:", searchTerm)
    if (!searchTerm.trim()) {
      toast({
        title: "Please enter a search term",
        description: "Enter a topic you'd like to generate content about.",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      setError(null)
      setBlogPost(null)

      console.log("Starting API call for:", searchTerm)

      // Test the API first
      console.log("Testing API endpoint...")
      try {
        const testResponse = await fetch("/api/test-generate")
        console.log("Test API status:", testResponse.status)
        const testData = await testResponse.json()
        console.log("Test API response:", testData)
      } catch (testError) {
        console.error("Test API failed:", testError)
      }

      const response = await fetch("/api/blog/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          searchQuery: searchTerm.trim(),
          forceRegenerate: false,
        }),
      })

      console.log("API Response status:", response.status)
      console.log("API Response headers:", Object.fromEntries(response.headers.entries()))

      // Check if response is ok first
      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = `HTTP ${response.status}`
        try {
          const errorText = await response.text()
          console.error("Error response text:", errorText.substring(0, 500))

          // Try to parse as JSON if possible
          try {
            const errorData = JSON.parse(errorText)
            errorMessage = errorData.error || errorMessage
          } catch {
            // If not JSON, use the text as error message
            errorMessage = errorText.substring(0, 200) || errorMessage
          }
        } catch (textError) {
          console.error("Failed to read error response:", textError)
        }

        throw new Error(errorMessage)
      }

      // Get the response text first
      const responseText = await response.text()
      console.log("Raw response:", responseText.substring(0, 500))

      // Try to parse as JSON
      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error("JSON parsing failed:", parseError)
        console.error("Response was:", responseText.substring(0, 1000))
        throw new Error("Server returned invalid JSON response. Please try again.")
      }

      console.log("Parsed data:", data)

      if (data.content) {
        setBlogPost(data.content)
        toast({
          title: data.isExisting ? "Content Found!" : "Content Generated!",
          description: data.isExisting
            ? "Found existing content for your topic!"
            : `Blog post created using ${data.content.ai_provider || "AI"}!`,
        })
      } else {
        throw new Error("No content received from API")
      }
    } catch (error) {
      console.error("Error in handleSearch:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to generate content"
      setError(`${errorMessage}. Please try again or try a different topic.`)
      toast({
        title: "Generation Failed",
        description: "Don't worry! Try a different topic or try again in a moment.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerate = async () => {
    if (!searchQuery) return
    await handleSearch(searchQuery)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      const newQuery = searchQuery.trim()
      router.push(`/blog-search?q=${encodeURIComponent(newQuery)}`)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
          <div className="flex gap-6 md:gap-10">
            <Link href="/" className="flex items-center space-x-2">
              <Sparkles className="h-6 w-6 text-blue-600" />
              <span className="inline-block font-bold text-gray-900">AI Content Generator</span>
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-4">
            <nav className="flex items-center space-x-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-gray-700 hover:text-gray-900">
                  Login
                </Button>
              </Link>
              <Link href="/login">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  Sign Up
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-16 md:py-24 bg-gradient-to-b from-blue-50 via-white to-gray-50">
          <div className="container px-4 md:px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <Link href="/blog" className="inline-block mb-6">
                  <Button variant="ghost" size="sm" className="gap-1 text-gray-600 hover:text-gray-900">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Blog
                  </Button>
                </Link>

                <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-gray-900 mb-6">
                  AI Content Generator
                </h1>
                <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                  Generate comprehensive, well-researched blog posts on any topic using advanced AI. Simply enter your
                  topic and let our AI create engaging content for you.
                </p>

                {/* Search Form */}
                <Card className="max-w-2xl mx-auto bg-white shadow-lg border-gray-200">
                  <CardContent className="p-6">
                    <form onSubmit={handleSearchSubmit} className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          type="text"
                          placeholder="Enter any topic (e.g., 'AI in healthcare', 'sustainable energy', 'digital marketing trends')"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-12 h-14 text-base bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                          disabled={loading}
                        />
                      </div>
                      <Button
                        type="submit"
                        size="lg"
                        className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                        disabled={loading || !searchQuery.trim()}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            Generating Content...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-5 w-5 mr-2" />
                            Generate Blog Post
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Results Section */}
        <section className="w-full py-12 bg-gray-50">
          <div className="container px-4 md:px-6">
            {loading ? (
              <div className="text-center py-16">
                <div className="max-w-md mx-auto">
                  <Sparkles className="h-20 w-20 animate-spin text-blue-600 mx-auto mb-6" />
                  <h3 className="text-2xl font-bold mb-4 text-gray-900">Creating Your Content</h3>
                  <p className="text-gray-600 text-lg">
                    Our AI is researching and writing a comprehensive guide about "{searchQuery}". This usually takes
                    30-60 seconds.
                  </p>
                  <div className="mt-6 bg-blue-50 rounded-lg p-4">
                    <p className="text-blue-800 text-sm">
                      💡 Tip: The longer and more specific your topic, the better the content will be!
                    </p>
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-16">
                <div className="max-w-md mx-auto">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                    <FileText className="h-8 w-8 text-red-600" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-gray-900">Generation Failed</h3>
                  <p className="text-gray-600 mb-6">{error}</p>
                  <div className="space-y-3">
                    <Button
                      onClick={() => handleSearch(searchQuery)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={loading || !searchQuery.trim()}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Again
                    </Button>
                    <p className="text-sm text-gray-500">Or try a different topic in the search box above</p>
                  </div>
                </div>
              </div>
            ) : blogPost ? (
              <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Generated Content</h2>
                    <p className="text-gray-600">Created using advanced AI technology</p>
                  </div>
                  <Button
                    onClick={handleRegenerate}
                    variant="outline"
                    disabled={loading}
                    className="border-gray-300 hover:bg-gray-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerate
                      </>
                    )}
                  </Button>
                </div>

                <Card className="bg-white border-gray-200 shadow-xl overflow-hidden">
                  {/* Header Image */}
                  <div className="h-80 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 flex items-center justify-center relative overflow-hidden">
                    {blogPost.image_url && !blogPost.image_url.includes("placeholder") ? (
                      <img
                        src={blogPost.image_url || "/placeholder.svg"}
                        alt={blogPost.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-black/20"></div>
                        <div className="relative text-center text-white z-10">
                          <Sparkles className="h-16 w-16 mx-auto mb-4 opacity-90" />
                          <h3 className="text-2xl font-bold mb-2">AI Generated Content</h3>
                          <p className="text-blue-100">Powered by {blogPost.ai_provider}</p>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                      </>
                    )}
                  </div>

                  <CardHeader className="p-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className="inline-block px-4 py-2 text-sm font-medium bg-blue-50 text-blue-700 rounded-full">
                        {blogPost.category}
                      </div>
                      <div className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
                        Generated using {blogPost.ai_provider}
                      </div>
                    </div>

                    <CardTitle className="text-4xl font-bold text-gray-900 mb-6 leading-tight">
                      {blogPost.title}
                    </CardTitle>

                    <CardDescription className="text-xl text-gray-600 mb-8 leading-relaxed">
                      {blogPost.excerpt}
                    </CardDescription>

                    {/* Metadata */}
                    <div className="flex items-center gap-8 text-gray-600 mb-8 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-sm font-bold text-white">
                          {blogPost.author.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{blogPost.author}</p>
                          <p className="text-sm text-gray-500">AI Content Creator</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        <span>{formatDate(blogPost.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        <span>{blogPost.read_time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Eye className="h-5 w-5" />
                        <span>{blogPost.view_count} views</span>
                      </div>
                    </div>

                    {/* Tags */}
                    {blogPost.tags && blogPost.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-8">
                        {blogPost.tags.slice(0, 6).map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                          >
                            <Tag className="h-3 w-3" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="p-8 pt-0">
                    <div className="flex gap-4 mb-8">
                      <Link href={`/blog/${blogPost.id}`} className="flex-1">
                        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-lg font-medium">
                          <FileText className="h-5 w-5 mr-2" />
                          Read Full Article
                        </Button>
                      </Link>
                      <Button variant="outline" className="border-gray-300 hover:bg-gray-50 h-12 px-8">
                        Share
                      </Button>
                    </div>

                    {/* Content Preview */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="font-semibold text-gray-900 mb-3">Content Preview</h4>
                      <div className="text-gray-700 leading-relaxed">{blogPost.content.substring(0, 500)}...</div>
                      <Link href={`/blog/${blogPost.id}`}>
                        <Button variant="link" className="p-0 h-auto text-blue-600 hover:text-blue-700 mt-3">
                          Continue reading →
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : query ? (
              <div className="text-center py-16">
                <div className="max-w-md mx-auto">
                  <Sparkles className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2 text-gray-900">Ready to Generate</h3>
                  <p className="text-gray-600 mb-6">
                    Click the button below to generate comprehensive content about "{query}".
                  </p>
                  <Button
                    onClick={() => handleSearch(query)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={loading}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Content
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="max-w-lg mx-auto">
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-50">
                    <Sparkles className="h-10 w-10 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-gray-900">Ready to Create Amazing Content?</h3>
                  <p className="text-gray-600 text-lg mb-8">
                    Enter any topic in the search box above and our AI will create a comprehensive, well-researched blog
                    post for you in seconds.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="text-blue-600 font-semibold mb-1">🎯 Targeted</div>
                      <div className="text-gray-600">Content tailored to your specific topic</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="text-blue-600 font-semibold mb-1">📚 Comprehensive</div>
                      <div className="text-gray-600">In-depth coverage with examples</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="text-blue-600 font-semibold mb-1">⚡ Fast</div>
                      <div className="text-gray-600">Generated in under 60 seconds</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 bg-white border-t border-gray-200">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-6 w-6 text-blue-600" />
              <span className="font-bold text-gray-900">AI Content Generator</span>
            </div>
            <p className="text-sm text-gray-600">
              © {new Date().getFullYear()} AI Content Generator. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function BlogSearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <Sparkles className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Loading AI Content Generator...</p>
          </div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  )
}
