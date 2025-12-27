"use client"

import type React from "react"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Sparkles, Calendar, Search, Clock, Eye, Tag, RefreshCw, FileText, Loader2, Zap, TrendingUp, BookOpen, CheckCircle2 } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"

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
      <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm">
        <div className="container flex h-14 sm:h-16 items-center space-x-2 sm:justify-between sm:space-x-0 px-4 sm:px-6">
          <div className="flex gap-4 sm:gap-6 md:gap-10">
            <Link href="/" className="flex items-center space-x-2 group">
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 group-hover:scale-110 transition-transform" />
              <span className="inline-block font-bold text-gray-900 text-sm sm:text-base">AI Content Generator</span>
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-2 sm:space-x-4">
            <nav className="flex items-center space-x-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-gray-700 hover:text-gray-900 h-9 px-3 sm:px-4">
                  Login
                </Button>
              </Link>
              <Link href="/login">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-3 sm:px-4">
                  Sign Up
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 sm:py-16 md:py-20 lg:py-24 bg-gradient-to-b from-blue-50 via-white to-gray-50 relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-400 rounded-full blur-3xl"></div>
          </div>
          
          <div className="container relative z-10 px-4 sm:px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8 sm:mb-12">
                <Link href="/blog" className="inline-block mb-4 sm:mb-6">
                  <Button variant="ghost" size="sm" className="gap-1 text-gray-600 hover:text-gray-900 h-9 group">
                    <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="hidden sm:inline">Back to Blog</span>
                    <span className="sm:hidden">Back</span>
                  </Button>
                </Link>

                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs sm:text-sm font-medium">
                    <Zap className="h-3 w-3 sm:h-4 sm:w-4" />
                    AI-Powered
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs sm:text-sm font-medium">
                    <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
                    Instant Generation
                  </div>
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-4 sm:mb-6 leading-tight">
                  AI Content Generator
                </h1>
                <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed px-4">
                  Generate comprehensive, well-researched blog posts on any topic using advanced AI. Simply enter your
                  topic and let our AI create engaging content for you in seconds.
                </p>

                {/* Search Form */}
                <Card className="max-w-2xl mx-auto bg-white shadow-xl border-gray-200">
                  <CardContent className="p-4 sm:p-6">
                    <form onSubmit={handleSearchSubmit} className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                        <Input
                          type="text"
                          placeholder="Enter any topic (e.g., 'AI in healthcare', 'sustainable energy')"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 sm:pl-12 h-12 sm:h-14 text-sm sm:text-base bg-white border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-gray-900 shadow-sm"
                          disabled={loading}
                        />
                      </div>
                      <Button
                        type="submit"
                        size="lg"
                        className="w-full h-11 sm:h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md hover:shadow-lg transition-all"
                        disabled={loading || !searchQuery.trim()}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 animate-spin" />
                            <span className="hidden sm:inline">Generating Content...</span>
                            <span className="sm:hidden">Generating...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                            Generate Blog Post
                          </>
                        )}
                      </Button>
                    </form>
                    <div className="mt-4 flex items-start gap-2 text-xs sm:text-sm text-gray-500">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Generated in 30-60 seconds • SEO-optimized • Comprehensive coverage</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Results Section */}
        <section className="w-full py-12 sm:py-16 bg-gray-50">
          <div className="container px-4 sm:px-6">
            {loading ? (
              <div className="text-center py-12 sm:py-16">
                <div className="max-w-lg mx-auto">
                  <div className="relative mb-6">
                    <div className="mx-auto flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-blue-100">
                      <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-blue-600" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 animate-pulse" />
                    </div>
                  </div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4 text-gray-900">
                    Creating Your Content
                  </h3>
                  <p className="text-gray-600 text-sm sm:text-base md:text-lg mb-4 sm:mb-6 leading-relaxed">
                    Our AI is researching and writing a comprehensive guide about <span className="font-semibold text-gray-900">"{searchQuery}"</span>. 
                    This usually takes 30-60 seconds.
                  </p>
                  <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-6 border border-blue-100">
                    <div className="flex items-start gap-3">
                      <Zap className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-left">
                        <p className="text-blue-900 font-medium text-sm sm:text-base mb-1">
                          Pro Tip
                        </p>
                        <p className="text-blue-800 text-xs sm:text-sm">
                          The longer and more specific your topic, the better the content will be! Include context and key points you want covered.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center justify-center gap-4 text-xs sm:text-sm text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
                      <span>Researching topic</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse delay-75"></div>
                      <span>Writing content</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-blue-300 animate-pulse delay-150"></div>
                      <span>Optimizing SEO</span>
                    </div>
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
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs sm:text-sm font-medium">
                        <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        Content Generated
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs sm:text-sm font-medium">
                        <Zap className="h-3 w-3 sm:h-4 sm:w-4" />
                        {blogPost.ai_provider}
                      </div>
                    </div>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                      Your Generated Content
                    </h2>
                    <p className="text-gray-600 text-sm sm:text-base">
                      Created using advanced AI technology • Ready to publish
                    </p>
                  </div>
                  <Button
                    onClick={handleRegenerate}
                    variant="outline"
                    disabled={loading}
                    className="border-gray-300 hover:bg-gray-50 h-10 sm:h-11 w-full sm:w-auto"
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
                  <div className="h-64 sm:h-80 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 flex items-center justify-center relative overflow-hidden">
                    {blogPost.image_url && !blogPost.image_url.includes("placeholder") ? (
                      <img
                        src={blogPost.image_url || "/placeholder.svg"}
                        alt={blogPost.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-black/20"></div>
                        <div className="relative text-center text-white z-10 px-4">
                          <Sparkles className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 opacity-90" />
                          <h3 className="text-xl sm:text-2xl font-bold mb-2">AI Generated Content</h3>
                          <p className="text-blue-100 text-sm sm:text-base">Powered by {blogPost.ai_provider}</p>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                      </>
                    )}
                  </div>

                  <CardHeader className="p-6 sm:p-8">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4 sm:mb-6">
                      <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                        <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
                        {blogPost.category}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
                        Generated using {blogPost.ai_provider}
                      </div>
                    </div>

                    <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight">
                      {blogPost.title}
                    </CardTitle>

                    <CardDescription className="text-base sm:text-lg md:text-xl text-gray-600 mb-6 sm:mb-8 leading-relaxed">
                      {blogPost.excerpt}
                    </CardDescription>

                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6 md:gap-8 text-gray-600 mb-6 sm:mb-8">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-xs sm:text-sm font-bold text-white border-2 border-white shadow-sm">
                          {blogPost.author.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm sm:text-base">{blogPost.author}</p>
                          <p className="text-xs sm:text-sm text-gray-500">AI Content Creator</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="text-xs sm:text-sm">{formatDate(blogPost.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="text-xs sm:text-sm">{blogPost.read_time}</span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="text-xs sm:text-sm">{blogPost.view_count} views</span>
                      </div>
                    </div>

                    {/* Tags */}
                    {blogPost.tags && blogPost.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
                        {blogPost.tags.slice(0, 6).map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-3 sm:px-4 py-1.5 text-xs sm:text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors border border-gray-200"
                          >
                            <Tag className="h-3 w-3" />
                            {tag}
                          </span>
                        ))}
                        {blogPost.tags.length > 6 && (
                          <span className="inline-flex items-center px-3 py-1.5 text-xs sm:text-sm text-gray-500">
                            +{blogPost.tags.length - 6} more
                          </span>
                        )}
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="p-6 sm:p-8 pt-0">
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8">
                      <Link href={`/blog/${blogPost.id}`} className="flex-1">
                        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 sm:h-12 text-base sm:text-lg font-medium shadow-md hover:shadow-lg transition-all">
                          <FileText className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                          Read Full Article
                        </Button>
                      </Link>
                      <Button variant="outline" className="border-gray-300 hover:bg-gray-50 h-11 sm:h-12 px-6 sm:px-8">
                        Share
                      </Button>
                    </div>

                    {/* Content Preview */}
                    <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-4 sm:p-6 border border-gray-200">
                      <div className="flex items-center gap-2 mb-3 sm:mb-4">
                        <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                        <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Content Preview</h4>
                      </div>
                      <div className="text-gray-700 leading-relaxed text-sm sm:text-base mb-4 line-clamp-4 sm:line-clamp-5">
                        {blogPost.content.substring(0, 500)}...
                      </div>
                      <Link href={`/blog/${blogPost.id}`}>
                        <Button variant="link" className="p-0 h-auto text-blue-600 hover:text-blue-700 font-medium text-sm sm:text-base">
                          Continue reading →
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : query ? (
              <div className="text-center py-12 sm:py-16">
                <div className="max-w-md mx-auto">
                  <div className="mx-auto mb-6 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-blue-50">
                    <Sparkles className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-semibold mb-3 text-gray-900">Ready to Generate</h3>
                  <p className="text-gray-600 mb-6 text-sm sm:text-base leading-relaxed">
                    Click the button below to generate comprehensive content about <span className="font-semibold text-gray-900">"{query}"</span>.
                  </p>
                  <Button
                    onClick={() => handleSearch(query)}
                    className="bg-blue-600 hover:bg-blue-700 text-white h-10 sm:h-11 px-6 shadow-md hover:shadow-lg transition-all"
                    disabled={loading}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Content
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 sm:py-16">
                <div className="max-w-2xl mx-auto">
                  <div className="mx-auto mb-6 flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-indigo-50">
                    <Sparkles className="h-10 w-10 sm:h-12 sm:w-12 text-blue-600" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold mb-4 text-gray-900">Ready to Create Amazing Content?</h3>
                  <p className="text-gray-600 text-base sm:text-lg mb-8 leading-relaxed px-4">
                    Enter any topic in the search box above and our AI will create a comprehensive, well-researched blog
                    post for you in seconds.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-sm">
                    <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="text-2xl sm:text-3xl mb-2">🎯</div>
                      <div className="text-blue-600 font-semibold mb-2 text-sm sm:text-base">Targeted</div>
                      <div className="text-gray-600 text-xs sm:text-sm">Content tailored to your specific topic</div>
                    </div>
                    <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="text-2xl sm:text-3xl mb-2">📚</div>
                      <div className="text-blue-600 font-semibold mb-2 text-sm sm:text-base">Comprehensive</div>
                      <div className="text-gray-600 text-xs sm:text-sm">In-depth coverage with examples</div>
                    </div>
                    <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="text-2xl sm:text-3xl mb-2">⚡</div>
                      <div className="text-blue-600 font-semibold mb-2 text-sm sm:text-base">Fast</div>
                      <div className="text-gray-600 text-xs sm:text-sm">Generated in under 60 seconds</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 sm:py-10 bg-white border-t border-gray-200">
        <div className="container px-4 sm:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 sm:space-y-5 text-center">
            <Link href="/" className="flex items-center space-x-2 group">
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 group-hover:scale-110 transition-transform" />
              <span className="font-bold text-gray-900 text-sm sm:text-base">AI Content Generator</span>
            </Link>
            <p className="text-xs sm:text-sm text-gray-600">
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
