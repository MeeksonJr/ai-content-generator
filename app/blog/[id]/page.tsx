import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Calendar, Clock, Eye, Tag, Sparkles, Zap, BookOpen, TrendingUp, Share2 } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { ReadingProgress } from "@/components/blog/reading-progress"
import { ShareButton } from "@/components/blog/share-button"
import { TableOfContents } from "@/components/blog/table-of-contents"
import { BlogMobileMenu } from "@/components/blog/blog-mobile-menu"
import type { JSX } from "react/jsx-runtime"

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
  ai_provider: string
}

async function getBlogPost(id: string): Promise<BlogPost | null> {
  try {
    console.log("Fetching blog post for ID:", id)

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const response = await fetch(`${baseUrl}/api/blog/${encodeURIComponent(id)}`, {
      cache: "no-store",
    })

    console.log("API response status:", response.status)

    if (!response.ok) {
      console.log("Blog post not found for ID:", id)
      return null
    }

    const data = await response.json()
    console.log("Successfully fetched blog post:", data.post?.id)
    return data.post
  } catch (error) {
    console.error("Error fetching blog post:", error)
    return null
  }
}

async function getRelatedPosts(category: string, currentId: string, limit: number = 3): Promise<BlogPost[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const response = await fetch(`${baseUrl}/api/blog-posts`, {
      cache: "no-store",
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    const posts = (data.results || []) as BlogPost[]
    
    // Filter out current post and get posts with same category
    const related = posts
      .filter((post) => post.id !== currentId && post.category === category)
      .slice(0, limit)
    
    // If not enough with same category, fill with other posts
    if (related.length < limit) {
      const others = posts
        .filter((post) => post.id !== currentId && post.category !== category)
        .slice(0, limit - related.length)
      return [...related, ...others]
    }
    
    return related
  } catch (error) {
    console.error("Error fetching related posts:", error)
    return []
  }
}

function SimpleMarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n")
  const elements: JSX.Element[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={i} className="text-3xl font-bold text-foreground mb-6 mt-8">
          {line.substring(2)}
        </h1>,
      )
    } else if (line.startsWith("## ")) {
      const text = line.substring(3).trim()
      const id = `heading-${i}-${text.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`
      elements.push(
        <h2 key={i} id={id} className="text-2xl font-semibold text-foreground mb-4 mt-6 scroll-mt-20">
          {text}
        </h2>,
      )
    } else if (line.startsWith("### ")) {
      const text = line.substring(4).trim()
      const id = `heading-${i}-${text.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`
      elements.push(
        <h3 key={i} id={id} className="text-xl font-semibold text-foreground mb-3 mt-4 scroll-mt-20">
          {text}
        </h3>,
      )
    } else if (line.startsWith("- ")) {
      // Handle bullet points
      const listItems = [line.substring(2)]
      let j = i + 1
      while (j < lines.length && lines[j].startsWith("- ")) {
        listItems.push(lines[j].substring(2))
        j++
      }
      elements.push(
        <ul key={i} className="list-disc list-inside mb-4 space-y-1 text-foreground">
          {listItems.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>,
      )
      i = j - 1
    } else if (line.match(/^\d+\. /)) {
      // Handle numbered lists
      const listItems = [line.replace(/^\d+\. /, "")]
      let j = i + 1
      while (j < lines.length && lines[j].match(/^\d+\. /)) {
        listItems.push(lines[j].replace(/^\d+\. /, ""))
        j++
      }
      elements.push(
        <ol key={i} className="list-decimal list-inside mb-4 space-y-1 text-foreground">
          {listItems.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ol>,
      )
      i = j - 1
    } else if (line.trim() === "") {
      elements.push(<br key={i} />)
    } else {
      // Regular paragraph
      const processedLine = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\*(.*?)\*/g, "<em>$1</em>")

      elements.push(
        <p
          key={i}
          className="mb-4 text-foreground leading-relaxed"
          dangerouslySetInnerHTML={{ __html: processedLine }}
        />,
      )
    }
  }

  return <div className="prose prose-lg max-w-none">{elements}</div>
}

export default async function BlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  console.log("BlogPostPage called with ID:", id)

  const blogPost = await getBlogPost(id)

  if (!blogPost) {
    console.log("Blog post not found, calling notFound()")
    notFound()
  }

  const relatedPosts = await getRelatedPosts(blogPost.category, blogPost.id, 3)
  const fullUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/blog/${id}`

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <ReadingProgress />
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
            {/* Mobile Menu */}
            <div className="md:hidden">
              <BlogMobileMenu />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <article className="w-full py-8 sm:py-12 md:py-16 lg:py-24 bg-muted/30">
          <div className="container px-4 sm:px-6">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
              {/* Main Content */}
              <div className="lg:col-span-8 space-y-6 sm:space-y-8">
                <Link href="/blog" className="inline-block">
                  <Button variant="ghost" size="sm" className="gap-1 h-9 group">
                    <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="hidden sm:inline">Back to Blog</span>
                    <span className="sm:hidden">Back</span>
                  </Button>
                </Link>

                <Card className="bg-card border-border shadow-xl hover:shadow-2xl hover:border-primary/50 transition-all duration-300 overflow-hidden">
                  <div className="h-56 sm:h-64 md:h-80 lg:h-96 overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 flex items-center justify-center relative group">
                    {blogPost.image_url && !blogPost.image_url.includes("placeholder") ? (
                      <>
                        <img
                          src={blogPost.image_url || "/placeholder.svg"}
                          alt={blogPost.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
                      </>
                    ) : (
                      <div className="text-center relative z-10">
                        <div className="mx-auto mb-4 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-background/20 backdrop-blur-sm border border-border/50">
                          <Sparkles className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                        </div>
                        <p className="text-primary font-medium text-sm sm:text-base">AI Generated Content</p>
                        <p className="text-primary/80 text-xs sm:text-sm mt-1">Powered by {blogPost.ai_provider}</p>
                      </div>
                    )}
                  </div>

                  <CardHeader className="p-6 sm:p-8">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium bg-primary/10 text-primary rounded-full border border-primary/20">
                        <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
                        {blogPost.category}
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm text-muted-foreground bg-muted rounded-full">
                        <Zap className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                        Generated using {blogPost.ai_provider}
                      </div>
                    </div>

                    <CardTitle className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3 sm:mb-4 leading-tight">
                      {blogPost.title}
                    </CardTitle>

                    <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-4 sm:mb-6 leading-relaxed">
                      {blogPost.excerpt}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-muted-foreground mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-border">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs sm:text-sm font-medium text-primary border border-primary/20 shadow-sm">
                          {blogPost.author.charAt(0)}
                        </div>
                        <div>
                          <span className="font-medium text-sm sm:text-base text-foreground">{blogPost.author}</span>
                          <p className="text-xs text-muted-foreground">AI Content Creator</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Calendar className="h-4 w-4" />
                        <span className="text-xs sm:text-sm">{formatDate(blogPost.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Clock className="h-4 w-4" />
                        <span className="text-xs sm:text-sm">{blogPost.read_time}</span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Eye className="h-4 w-4" />
                        <span className="text-xs sm:text-sm">{blogPost.view_count} views</span>
                      </div>
                    </div>

                    {blogPost.tags && blogPost.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {blogPost.tags.slice(0, 8).map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs sm:text-sm bg-muted text-foreground rounded-full border border-border hover:bg-muted/80 transition-colors"
                          >
                            <Tag className="h-3 w-3" />
                            {tag}
                          </span>
                        ))}
                        {blogPost.tags.length > 8 && (
                          <span className="inline-flex items-center px-3 py-1.5 text-xs sm:text-sm text-muted-foreground">
                            +{blogPost.tags.length - 8} more
                          </span>
                        )}
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="p-6 sm:p-8 pt-0">
                    <div className="mb-6 sm:mb-8 prose prose-lg sm:prose-xl max-w-none dark:prose-invert">
                      <SimpleMarkdownRenderer content={blogPost.content} />
                    </div>

                    <div className="border-t border-border pt-6 sm:pt-8">
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center">
                        <Link href={`/blog-search?q=${encodeURIComponent(blogPost.search_query)}`} className="flex-1 sm:flex-initial">
                          <Button variant="outline" className="w-full sm:w-auto h-10 sm:h-11">
                            <Sparkles className="h-4 w-4 mr-2" />
                            Regenerate Content
                          </Button>
                        </Link>
                        <div className="flex-1 sm:flex-initial">
                          <ShareButton title={blogPost.title} url={fullUrl} excerpt={blogPost.excerpt} />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {relatedPosts.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-6">Related Articles</h2>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {relatedPosts.map((post) => (
                        <Link key={post.id} href={`/blog/${post.id}`} className="group">
                          <Card className="h-full border border-border transition-all duration-300 shadow-sm hover:shadow-xl hover:border-primary/50 hover:-translate-y-1 bg-card">
                            <div className="h-40 overflow-hidden bg-muted">
                              <img
                                src={post.image_url || "/placeholder.svg?height=200&width=300"}
                                alt={post.title}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            </div>
                            <CardHeader>
                              <div className="inline-block px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full mb-2 border border-primary/20">
                                {post.category}
                              </div>
                              <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors line-clamp-2">
                                {post.title}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>
                            </CardHeader>
                            <CardContent>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>{post.read_time}</span>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar with Table of Contents */}
              <div className="lg:col-span-4">
                <div className="sticky top-20 sm:top-24 space-y-6">
                  <TableOfContents content={blogPost.content} />
                  
                  {/* Quick Actions Card */}
                  <Card className="bg-gradient-to-br from-muted/50 to-muted/30 border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base sm:text-lg font-bold text-foreground">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Link href={`/blog-search?q=${encodeURIComponent(blogPost.search_query)}`} className="block">
                        <Button variant="outline" className="w-full justify-start h-10">
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate Similar
                        </Button>
                      </Link>
                      <ShareButton title={blogPost.title} url={fullUrl} excerpt={blogPost.excerpt} />
                      <Link href="/blog" className="block">
                        <Button variant="outline" className="w-full justify-start h-10">
                          <ArrowLeft className="h-4 w-4 mr-2" />
                          Browse More Articles
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </div>
              </div>
          </div>
          </div>
        </article>
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
