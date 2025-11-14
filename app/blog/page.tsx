"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Sparkles, Calendar, Search, Clock, Eye, Tag, Menu } from "lucide-react"
import { BlogMobileMenu } from "@/components/blog/blog-mobile-menu"
import { formatDate } from "@/lib/utils"

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
  tags: string[]
  read_time: string
  view_count: number
  created_at: string
}

export default function BlogPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchBlogPosts()
  }, [])

  const fetchBlogPosts = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log("Fetching blog posts...")

      // Use a different endpoint to avoid route conflicts
      const response = await fetch("/api/blog-posts", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      console.log("Response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("API Error:", errorText)
        throw new Error(`Failed to fetch blog posts: ${response.status}`)
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const responseText = await response.text()
        console.error("Non-JSON response:", responseText.substring(0, 200))
        throw new Error("Server returned non-JSON response")
      }

      const data = await response.json()
      console.log("Fetched data:", data)
      setBlogPosts(data.results || [])
    } catch (error) {
      console.error("Error fetching blog posts:", error)
      setError(error instanceof Error ? error.message : "Failed to fetch blog posts")
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/blog-search?q=${encodeURIComponent(searchQuery.trim())}`)
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
            <nav className="hidden md:flex gap-6">
              <Link
                href="/blog"
                className="flex items-center text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
              >
                Blog
              </Link>
              <Link
                href="/about"
                className="flex items-center text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
              >
                About
              </Link>
              <Link
                href="/careers"
                className="flex items-center text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
              >
                Careers
              </Link>
            </nav>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-4">
            <nav className="hidden md:flex items-center space-x-2">
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
            <div className="md:hidden">
              <BlogMobileMenu />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-blue-50 to-white">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-start gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-1 text-gray-600 hover:text-gray-900">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Home
                </Button>
              </Link>
              <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl text-gray-900">AI-Generated Blog</h1>
              <p className="max-w-[700px] text-gray-600 md:text-xl">
                Discover insights, tips, and comprehensive guides on any topic, all powered by advanced AI technology.
              </p>

              {/* Search Section */}
              <div className="w-full max-w-2xl mt-8">
                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search for any topic or generate new content..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-12 text-base bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                  <Button type="submit" size="lg" className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white">
                    <Search className="h-4 w-4 mr-2" />
                    Search & Generate
                  </Button>
                </form>
                <p className="text-sm text-gray-500 mt-2">
                  Can't find what you're looking for? We'll generate a comprehensive guide for you using AI!
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Blog Posts Section */}
        <section className="w-full py-12 md:py-24 bg-gray-50">
          <div className="container px-4 md:px-6">
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Latest Articles</h2>
              <p className="text-gray-600 text-lg">
                Explore our collection of AI-generated content covering a wide range of topics.
              </p>
            </div>

            {loading ? (
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="bg-white border-gray-200 animate-pulse">
                    <div className="h-48 bg-gray-200"></div>
                    <CardHeader>
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-6 bg-gray-200 rounded w-full mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="max-w-md mx-auto">
                  <h3 className="text-xl font-semibold mb-2 text-red-600">Error Loading Blog Posts</h3>
                  <p className="text-gray-600 mb-6">{error}</p>
                  <Button onClick={fetchBlogPosts} className="bg-blue-600 hover:bg-blue-700 text-white">
                    Try Again
                  </Button>
                </div>
              </div>
            ) : blogPosts.length > 0 ? (
              <>
                {/* Featured Post */}
                {blogPosts[0] && (
                  <div className="mb-16">
                    <div className="relative rounded-2xl overflow-hidden shadow-xl bg-white border border-gray-200">
                      <div className="grid md:grid-cols-2">
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 md:p-12 flex items-center">
                          <div className="text-white">
                            <div className="inline-block px-3 py-1 mb-4 text-sm font-medium bg-white/20 rounded-full">
                              Featured
                            </div>
                            <h3 className="text-3xl font-bold mb-4">{blogPosts[0].title}</h3>
                            <p className="text-lg opacity-90 mb-6">{blogPosts[0].excerpt}</p>
                            <div className="flex items-center gap-4 text-sm mb-6">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-medium">
                                  {blogPosts[0].author.charAt(0)}
                                </div>
                                <span>{blogPosts[0].author}</span>
                              </div>
                              <div>•</div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDate(blogPosts[0].created_at)}</span>
                              </div>
                              <div>•</div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>{blogPosts[0].read_time}</span>
                              </div>
                            </div>
                            <Link href={`/blog/${blogPosts[0].id}`}>
                              <Button className="bg-white text-blue-600 hover:bg-gray-100">Read Article</Button>
                            </Link>
                          </div>
                        </div>
                        <div className="h-64 md:h-auto bg-gray-100">
                          <img
                            src={blogPosts[0].image_url || "/placeholder.svg?height=400&width=600"}
                            alt={blogPosts[0].title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Blog Grid */}
                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                  {blogPosts.slice(1).map((post) => (
                    <Link key={post.id} href={`/blog/${post.id}`} className="group">
                      <Card className="h-full border border-gray-200 transition-all duration-200 shadow-sm hover:shadow-lg bg-white">
                        <div className="h-48 overflow-hidden bg-gray-100">
                          <img
                            src={post.image_url || "/placeholder.svg?height=300&width=400"}
                            alt={post.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                        <CardHeader>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="inline-block px-3 py-1 text-xs font-medium bg-blue-50 text-blue-600 rounded-full">
                              {post.category}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Eye className="h-3 w-3" />
                              <span>{post.view_count}</span>
                            </div>
                          </div>
                          <CardTitle className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                            {post.title}
                          </CardTitle>
                          <CardDescription className="text-gray-600 line-clamp-3">{post.excerpt}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-600">
                                {post.author.charAt(0)}
                              </div>
                              <span>{post.author}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span>{post.read_time}</span>
                            </div>
                          </div>
                          {post.tags && post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {post.tags.slice(0, 3).map((tag, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                                >
                                  <Tag className="h-3 w-3" />
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>

                <div className="mt-16 text-center">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    onClick={fetchBlogPosts}
                  >
                    Load More Articles
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="max-w-md mx-auto">
                  <Sparkles className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2 text-gray-900">No blog posts yet</h3>
                  <p className="text-gray-600 mb-6">
                    Be the first to generate content! Search for any topic above to create a comprehensive guide.
                  </p>
                  <Link href="/blog-search">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate First Post
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Newsletter Section */}
        <section className="w-full py-12 md:py-24 bg-white">
          <div className="container px-4 md:px-6">
            <div className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-blue-50 p-8 shadow-sm">
              <h2 className="text-2xl font-bold mb-4 text-center text-gray-900">Stay Updated with AI Content</h2>
              <p className="text-gray-600 mb-6 text-center">
                Get the latest AI-generated insights and comprehensive guides delivered to your inbox.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border-0 text-white">
                  Subscribe
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 bg-gray-100 border-t border-gray-200">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-6 w-6 text-blue-600" />
              <span className="font-bold text-gray-900">AI Content Generator</span>
            </div>
            <p className="text-sm text-gray-600">
              © {new Date().getFullYear()} AI Content Generator. All rights reserved.
            </p>
            <div className="flex space-x-4">
              <Link href="/privacy" className="text-xs text-gray-600 hover:text-gray-900">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-xs text-gray-600 hover:text-gray-900">
                Terms of Service
              </Link>
              <Link href="/cookies" className="text-xs text-gray-600 hover:text-gray-900">
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
