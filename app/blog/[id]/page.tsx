import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Calendar, Clock, Eye, Tag, Sparkles } from "lucide-react"
import { formatDate } from "@/lib/utils"
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

function SimpleMarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n")
  const elements: JSX.Element[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={i} className="text-3xl font-bold text-gray-900 mb-6 mt-8">
          {line.substring(2)}
        </h1>,
      )
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-2xl font-semibold text-gray-900 mb-4 mt-6">
          {line.substring(3)}
        </h2>,
      )
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-xl font-semibold text-gray-900 mb-3 mt-4">
          {line.substring(4)}
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
        <ul key={i} className="list-disc list-inside mb-4 space-y-1 text-gray-700">
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
        <ol key={i} className="list-decimal list-inside mb-4 space-y-1 text-gray-700">
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
          className="mb-4 text-gray-700 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: processedLine }}
        />,
      )
    }
  }

  return <div className="prose prose-lg max-w-none">{elements}</div>
}

export default async function BlogPostPage({ params }: { params: { id: string } }) {
  console.log("BlogPostPage called with ID:", params.id)

  const blogPost = await getBlogPost(params.id)

  if (!blogPost) {
    console.log("Blog post not found, calling notFound()")
    notFound()
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
        <article className="w-full py-12 md:py-24 bg-gray-50">
          <div className="container px-4 md:px-6">
            <div className="max-w-4xl mx-auto">
              <Link href="/blog" className="inline-block mb-6">
                <Button variant="ghost" size="sm" className="gap-1 text-gray-600 hover:text-gray-900">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Blog
                </Button>
              </Link>

              <Card className="bg-white border-gray-200 shadow-lg">
                {/* Hero Image */}
                <div className="h-64 md:h-80 overflow-hidden bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center justify-center">
                  {blogPost.image_url && !blogPost.image_url.includes("placeholder") ? (
                    <img
                      src={blogPost.image_url || "/placeholder.svg"}
                      alt={blogPost.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center">
                      <Sparkles className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                      <p className="text-blue-800 font-medium">AI Generated Content</p>
                    </div>
                  )}
                </div>

                <CardHeader>
                  {/* Category and AI Provider */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="inline-block px-3 py-1 text-sm font-medium bg-blue-50 text-blue-600 rounded-full">
                      {blogPost.category}
                    </div>
                    <div className="text-sm text-gray-500">Generated using {blogPost.ai_provider}</div>
                  </div>

                  {/* Title */}
                  <CardTitle className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{blogPost.title}</CardTitle>

                  {/* Excerpt */}
                  <p className="text-lg text-gray-600 mb-6">{blogPost.excerpt}</p>

                  {/* Meta Information */}
                  <div className="flex items-center gap-6 text-gray-600 mb-6 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-600">
                        {blogPost.author.charAt(0)}
                      </div>
                      <span className="font-medium">{blogPost.author}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(blogPost.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{blogPost.read_time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      <span>{blogPost.view_count} views</span>
                    </div>
                  </div>

                  {/* Tags */}
                  {blogPost.tags && blogPost.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {blogPost.tags.slice(0, 6).map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-full"
                        >
                          <Tag className="h-3 w-3" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </CardHeader>

                <CardContent>
                  {/* Content */}
                  <div className="mb-8">
                    <SimpleMarkdownRenderer content={blogPost.content} />
                  </div>

                  {/* Actions */}
                  <div className="border-t border-gray-200 pt-6">
                    <div className="flex gap-4 justify-center">
                      <Link href={`/blog-search?q=${encodeURIComponent(blogPost.search_query)}`}>
                        <Button variant="outline" className="border-gray-300">
                          <Sparkles className="h-4 w-4 mr-2" />
                          Regenerate Content
                        </Button>
                      </Link>
                      <Button variant="outline" className="border-gray-300">
                        Share Article
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </article>
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
          </div>
        </div>
      </footer>
    </div>
  )
}
