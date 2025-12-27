"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Sparkles, Calendar, Search, Clock, Eye, Tag, Menu, TrendingUp, BookOpen, Zap } from "lucide-react"
import { BlogMobileMenu } from "@/components/blog/blog-mobile-menu"
import { formatDate } from "@/lib/utils"
import { BlogPostSkeleton, ContentGridSkeleton } from "@/components/ui/loading-skeleton"
import { Skeleton } from "@/components/ui/skeleton"
import { Pagination } from "@/components/ui/pagination"

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
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const router = useRouter()

  useEffect(() => {
    fetchBlogPosts(currentPage)
  }, [currentPage])

  const fetchBlogPosts = async (page = 1) => {
    try {
      setLoading(true)
      setError(null)
      console.log("Fetching blog posts...")

      // Use a different endpoint to avoid route conflicts
      const response = await fetch(`/api/blog-posts?page=${page}&limit=12`, {
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
      if (data.pagination) {
        setCurrentPage(data.pagination.currentPage)
        setTotalPages(data.pagination.totalPages)
        setTotalItems(data.pagination.totalItems)
      }
    } catch (error) {
      console.error("Error fetching blog posts:", error)
      setError(error instanceof Error ? error.message : "Failed to fetch blog posts")
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/blog-search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="container flex h-14 sm:h-16 items-center space-x-2 sm:justify-between sm:space-x-0 px-4 sm:px-6">
          <div className="flex gap-4 sm:gap-6 md:gap-10">
            <Link href="/" className="flex items-center space-x-2 group">
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary group-hover:scale-110 transition-transform" />
              <span className="inline-block font-bold text-foreground text-sm sm:text-base">AI Content Generator</span>
            </Link>
            <nav className="hidden md:flex gap-4 lg:gap-6">
              <Link
                href="/blog"
                className="flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Blog
              </Link>
              <Link
                href="/about"
                className="flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                About
              </Link>
              <Link
                href="/careers"
                className="flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Careers
              </Link>
            </nav>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-2 sm:space-x-4">
            <nav className="hidden md:flex items-center space-x-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="h-9 px-3 sm:px-4">
                  Login
                </Button>
              </Link>
              <Link href="/login">
                <Button size="sm" className="h-9 px-3 sm:px-4">
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
        <section className="w-full py-8 sm:py-12 md:py-16 lg:py-24 bg-gradient-to-b from-muted/50 via-background to-muted/30 relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute inset-0 opacity-5 dark:opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/60 rounded-full blur-3xl"></div>
          </div>
          
          <div className="container relative z-10 px-4 sm:px-6">
            <div className="flex flex-col items-start gap-4 sm:gap-6">
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-1 h-9 group">
                  <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                  <span className="hidden sm:inline">Back to Home</span>
                  <span className="sm:hidden">Back</span>
                </Button>
              </Link>
              
              <div className="w-full max-w-4xl">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs sm:text-sm font-medium border border-primary/20">
                    <Zap className="h-3 w-3 sm:h-4 sm:w-4" />
                    AI-Powered Content
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs sm:text-sm font-medium border border-primary/20">
                    <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
                    {blogPosts.length > 0 ? `${blogPosts.length} Articles` : "Discover Articles"}
                  </div>
                </div>
                
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-4 sm:mb-6 leading-tight">
                  AI-Generated Blog
                </h1>
                <p className="max-w-[700px] text-muted-foreground text-base sm:text-lg md:text-xl mb-6 sm:mb-8 leading-relaxed">
                  Discover insights, tips, and comprehensive guides on any topic, all powered by advanced AI technology. 
                  Explore our collection or generate new content tailored to your needs.
                </p>

                {/* Search Section */}
                <div className="w-full max-w-3xl">
                  <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search for any topic or generate new content..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 sm:pl-12 h-11 sm:h-12 text-sm sm:text-base shadow-sm"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      size="lg" 
                      className="h-11 sm:h-12 px-6 sm:px-8 font-medium shadow-md hover:shadow-lg transition-all"
                    >
                      <Search className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      <span className="hidden sm:inline">Search & Generate</span>
                      <span className="sm:hidden">Search</span>
                    </Button>
                  </form>
                  <div className="flex items-start gap-2 mt-3">
                    <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      Can't find what you're looking for? We'll generate a comprehensive guide for you using AI in seconds!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Blog Posts Section */}
        <section className="w-full py-12 sm:py-16 md:py-24 bg-muted/30">
          <div className="container px-4 sm:px-6">
            {!loading && blogPosts.length > 0 && (
              <div className="mb-8 sm:mb-12">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2 sm:mb-3">
                      Latest Articles
                    </h2>
                    <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
                      Explore our collection of AI-generated content covering a wide range of topics.
                    </p>
                  </div>
                  {blogPosts.length > 0 && (
                    <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-card rounded-lg border border-border shadow-sm">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">{blogPosts.length} Articles</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {loading ? (
              <div className="space-y-8 sm:space-y-12">
                {/* Featured Post Skeleton */}
                <div className="relative rounded-2xl overflow-hidden shadow-xl bg-card border border-border animate-pulse">
                  <div className="grid md:grid-cols-2">
                    <div className="bg-gradient-to-r from-primary to-primary/80 p-8 md:p-12">
                      <Skeleton className="h-6 w-24 mb-4 bg-white/20" />
                      <Skeleton className="h-8 w-full mb-4 bg-white/20" />
                      <Skeleton className="h-6 w-3/4 mb-6 bg-white/20" />
                      <Skeleton className="h-10 w-32 bg-white/20" />
                    </div>
                    <Skeleton className="h-64 md:h-auto bg-muted" />
                  </div>
                </div>
                {/* Grid Skeleton */}
                <ContentGridSkeleton count={6} />
              </div>
            ) : error ? (
              <div className="text-center py-12 sm:py-16">
                <div className="max-w-md mx-auto">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                    <Sparkles className="h-8 w-8 text-destructive" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-semibold mb-2 text-destructive">Error Loading Blog Posts</h3>
                  <p className="text-muted-foreground mb-6 text-sm sm:text-base">{error}</p>
                  <Button 
                    onClick={() => fetchBlogPosts(currentPage)} 
                    className="h-10 sm:h-11 px-6"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            ) : blogPosts.length > 0 ? (
              <>
                {/* Featured Post */}
                {blogPosts[0] && (
                  <div className="mb-12 sm:mb-16">
                    <div className="relative rounded-2xl overflow-hidden shadow-xl bg-card border border-border hover:shadow-2xl hover:border-primary/50 transition-all duration-300">
                      <div className="grid md:grid-cols-2">
                        <div className="bg-gradient-to-r from-primary via-primary/90 to-primary/80 p-6 sm:p-8 md:p-12 flex items-center relative overflow-hidden">
                          {/* Decorative pattern */}
                          <div className="absolute inset-0 opacity-10">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl"></div>
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full blur-3xl"></div>
                          </div>
                          <div className="text-white relative z-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 text-xs sm:text-sm font-medium bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
                              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                              Featured Article
                            </div>
                            <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 leading-tight">
                              {blogPosts[0].title}
                            </h3>
                            <p className="text-sm sm:text-base md:text-lg opacity-90 mb-4 sm:mb-6 line-clamp-3">
                              {blogPosts[0].excerpt}
                            </p>
                            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm mb-4 sm:mb-6">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-xs font-medium border border-white/30">
                                  {blogPosts[0].author.charAt(0)}
                                </div>
                                <span className="font-medium">{blogPosts[0].author}</span>
                              </div>
                              <div className="hidden sm:block text-white/60">•</div>
                              <div className="flex items-center gap-1.5 sm:gap-2">
                                <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span>{formatDate(blogPosts[0].created_at)}</span>
                              </div>
                              <div className="hidden sm:block text-white/60">•</div>
                              <div className="flex items-center gap-1.5 sm:gap-2">
                                <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span>{blogPosts[0].read_time}</span>
                              </div>
                              <div className="hidden sm:block text-white/60">•</div>
                              <div className="flex items-center gap-1.5 sm:gap-2">
                                <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span>{blogPosts[0].view_count} views</span>
                              </div>
                            </div>
                            <Link href={`/blog/${blogPosts[0].id}`}>
                              <Button className="bg-background text-primary hover:bg-background/90 font-medium h-10 sm:h-11 px-6 shadow-lg hover:shadow-xl transition-all">
                                Read Article
                                <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                        <div className="h-64 sm:h-80 md:h-auto bg-muted relative overflow-hidden group">
                          <Image
                            src={blogPosts[0].image_url || "/placeholder.svg"}
                            alt={blogPosts[0].title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                            sizes="(max-width: 768px) 100vw, 50vw"
                            priority
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Blog Grid */}
                <div className="grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {blogPosts.slice(1).map((post) => (
                    <Link key={post.id} href={`/blog/${post.id}`} className="group">
                      <Card className="h-full border border-border transition-all duration-300 shadow-sm hover:shadow-xl hover:border-primary/50 hover:-translate-y-1 bg-card overflow-hidden">
                        <div className="h-48 sm:h-56 overflow-hidden bg-muted relative">
                          <Image
                            src={post.image_url || "/placeholder.svg"}
                            alt={post.title}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-110"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          <div className="absolute top-3 left-3">
                            <div className="inline-block px-2.5 py-1 text-xs font-medium bg-background/90 backdrop-blur-sm text-primary rounded-full shadow-sm border border-border/50">
                              {post.category}
                            </div>
                          </div>
                        </div>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(post.created_at)}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Eye className="h-3 w-3" />
                              <span>{post.view_count}</span>
                            </div>
                          </div>
                          <CardTitle className="text-lg sm:text-xl font-bold group-hover:text-primary transition-colors line-clamp-2 mb-2">
                            {post.title}
                          </CardTitle>
                          <CardDescription className="text-sm line-clamp-2 sm:line-clamp-3">
                            {post.excerpt}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground mb-3 pb-3 border-b border-border">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary border border-primary/20">
                                {post.author.charAt(0)}
                              </div>
                              <span className="font-medium">{post.author}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span>{post.read_time}</span>
                            </div>
                          </div>
                          {post.tags && post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {post.tags.slice(0, 3).map((tag, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-muted text-foreground rounded-md border border-border hover:bg-muted/80 transition-colors"
                                >
                                  <Tag className="h-3 w-3" />
                                  {tag}
                                </span>
                              ))}
                              {post.tags.length > 3 && (
                                <span className="inline-flex items-center px-2 py-1 text-xs text-muted-foreground">
                                  +{post.tags.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="mt-12 sm:mt-16">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                    />
                    <p className="text-center text-sm text-muted-foreground mt-4">
                      Showing {blogPosts.length} of {totalItems} articles
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 sm:py-16">
                <div className="max-w-lg mx-auto">
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-semibold mb-3 text-foreground">No blog posts yet</h3>
                  <p className="text-muted-foreground mb-6 text-sm sm:text-base leading-relaxed">
                    Be the first to generate content! Search for any topic above to create a comprehensive guide using our AI technology.
                  </p>
                  <Link href="/blog-search">
                    <Button className="h-10 sm:h-11 px-6 shadow-md hover:shadow-lg transition-all">
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
        <section className="w-full py-12 sm:py-16 md:py-24 bg-gradient-to-b from-background to-muted/30">
          <div className="container px-4 sm:px-6">
            <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-gradient-to-br from-muted/50 to-muted/30 p-6 sm:p-8 md:p-10 shadow-lg relative overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl opacity-20"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/20 rounded-full blur-3xl opacity-20"></div>
              
              <div className="relative z-10">
                <div className="text-center mb-6 sm:mb-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary mb-4 mx-auto">
                    <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-primary-foreground" />
                  </div>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 text-foreground">
                    Stay Updated with AI Content
                  </h2>
                  <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                    Get the latest AI-generated insights and comprehensive guides delivered to your inbox. 
                    Never miss a new article!
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    className="flex h-11 sm:h-12 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm sm:text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring shadow-sm"
                  />
                  <Button className="h-11 sm:h-12 px-6 sm:px-8 font-medium shadow-md hover:shadow-lg transition-all">
                    Subscribe
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  We respect your privacy. Unsubscribe at any time.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 sm:py-10 bg-muted/50 border-t border-border">
        <div className="container px-4 sm:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 sm:space-y-5 text-center">
            <Link href="/" className="flex items-center space-x-2 group">
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary group-hover:scale-110 transition-transform" />
              <span className="font-bold text-foreground text-sm sm:text-base">AI Content Generator</span>
            </Link>
            <p className="text-xs sm:text-sm text-muted-foreground">
              © {new Date().getFullYear()} AI Content Generator. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
              <Link href="/privacy" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors">
                Terms of Service
              </Link>
              <Link href="/cookies" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors">
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
