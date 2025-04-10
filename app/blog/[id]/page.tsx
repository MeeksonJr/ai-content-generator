"use client"

import Link from "next/link"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Download, Sparkles, Calendar, ArrowRight, Clock } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { generateContent } from "@/lib/ai/gemini-client"
import { useState, useEffect } from "react"

// Sample blog data - in a real app, this would come from a database
const blogs = [
  {
    id: "1",
    title: "AI Technology: How AI is Revolutionizing Content Creation",
    description:
      "Discover how artificial intelligence is transforming the way businesses create and optimize content for their audiences.",
    author: "Alex Chen",
    date: "2025-04-05",
    readTime: "5 min read",
    category: "Technology",
    image: "/placeholder.svg?height=600&width=1200",
  },
  {
    id: "2",
    title: "The Future of SEO with AI-Generated Content",
    description:
      "Learn how AI-powered content generation is changing SEO strategies and what it means for digital marketers.",
    author: "Sarah Johnson",
    date: "2025-03-28",
    readTime: "7 min read",
    category: "Marketing",
    image: "/placeholder.svg?height=600&width=1200",
  },
  {
    id: "3",
    title: "Maximizing E-commerce Conversions with AI Copy",
    description:
      "Explore how e-commerce businesses are using AI to create product descriptions that convert browsers into buyers.",
    author: "Michael Wong",
    date: "2025-03-15",
    readTime: "6 min read",
    category: "E-commerce",
    image: "/placeholder.svg?height=600&width=1200",
  },
  {
    id: "4",
    title: "Ethical Considerations in AI Content Creation",
    description:
      "A deep dive into the ethical implications of using AI to generate content and how businesses can navigate these challenges.",
    author: "Dr. Emily Roberts",
    date: "2025-02-20",
    readTime: "8 min read",
    category: "Ethics",
    image: "/placeholder.svg?height=600&width=1200",
  },
  {
    id: "5",
    title: "How Small Businesses Can Leverage AI for Content Marketing",
    description:
      "Practical strategies for small businesses to use AI content generation tools to compete with larger companies.",
    author: "David Martinez",
    date: "2025-02-10",
    readTime: "4 min read",
    category: "Small Business",
    image: "/placeholder.svg?height=600&width=1200",
  },
]

// Fallback blog content for when the API fails
const fallbackBlogContent = `
# Introduction

AI-powered content generation is revolutionizing how businesses create marketing materials, product descriptions, and blog posts. This technology enables faster content creation while maintaining quality and relevance.

## Key Benefits of AI Content Generation

AI content generation offers several advantages for businesses:

- **Efficiency**: Create content in seconds rather than hours or days
- **Consistency**: Maintain a consistent brand voice across all content
- **Scalability**: Generate large volumes of content without proportional increases in time or resources
- **SEO Optimization**: Automatically include relevant keywords and phrases

## How Businesses Are Using AI Content

Modern businesses are implementing AI content generation in various ways:

- E-commerce product descriptions
- Blog posts and articles
- Social media updates
- Email marketing campaigns
- Ad copy for digital marketing

## Getting Started with AI Content Generation

If you're interested in leveraging AI for your content needs:

1. Identify your content requirements
2. Choose the right AI content platform
3. Provide clear guidelines and examples
4. Review and refine the generated content
5. Measure performance and iterate

## Conclusion

AI content generation is not just a trend but a transformative technology that's changing how businesses approach content creation. By embracing these tools, companies can produce more content, faster, while maintaining quality and relevance.
`

export default function BlogPost({ params }: { params: { id: string } }) {
  const [blogContent, setBlogContent] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const blog = blogs.find((blog) => blog.id === params.id)
  
  interface blog {
    contentType: "product-description" | "blog-post" | "social-media" | "email" | "ad-copy" | "blog_post"
    title: string
    prompt: string
    temperature?: number
    maxLength?: number
    category?: string
    description?: string
  }
  if (!blog) {
    notFound()
  }

  useEffect(() => {
    async function loadBlogContent() {
      try {
        setIsLoading(true)

        // Generate the blog content using Gemini
        const prompt = `
          Write a comprehensive, informative, and engaging blog post with the following details:
          
          Title: ${blog.title}
          Description: ${blog.description}
          Category: ${blog.category}
          
          The blog should be well-structured with:
          1. An engaging introduction that hooks the reader
          2. 3-5 main sections with subheadings
          3. Practical examples and actionable insights
          4. A conclusion that summarizes key points
          
          The tone should be professional but conversational, and the content should be informative and valuable to readers interested in this topic.
          Include some statistics or research findings where appropriate (you can create plausible ones).
          
          Format the blog post in markdown with proper headings (##, ###), paragraphs, bullet points, and emphasis where appropriate.
        `

        const { content, success, error } = await generateContent({
          contentType: "blog_post",
          title: blog.title,
          prompt: prompt,
          category: blog.category,
          description: blog.description,
        })

        if (!success || !content) {
          console.warn("Failed to generate blog content:", error)
          setBlogContent(processMarkdown(fallbackBlogContent))
          setError("We're experiencing high demand. Using a simplified version of this article.")
        } else {
          setBlogContent(processMarkdown(content))
        }
      } catch (err) {
        console.error("Error loading blog content:", err)
        setBlogContent(processMarkdown(fallbackBlogContent))
        setError("We're experiencing technical difficulties. Using a simplified version of this article.")
      } finally {
        setIsLoading(false)
      }
    }

    loadBlogContent()
  }, [blog.title, blog.description, blog.category])

  // Process the markdown content to HTML (simple version)
  function processMarkdown(markdown: string) {
    return markdown
      .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold my-6">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold my-5 pt-4">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold my-4 pt-2">$1</h3>')
      .replace(/\*\*(.*)\*\*/gim, '<strong class="font-semibold">$1</strong>')
      .replace(/\*(.*)\*/gim, '<em class="italic">$1</em>')
      .replace(/\n\n/gim, '</p><p class="my-4 text-gray-700 leading-relaxed">')
      .replace(/^- (.*$)/gim, '<li class="ml-6 list-disc my-2 text-gray-700">$1</li>')
  }

  // Function to download blog as text
  const downloadBlogContent = () => {
    // Strip HTML tags for plain text download
    const stripHtml = (html: string) => {
      return html.replace(/<[^>]*>?/gm, "")
    }

    const blogText = `
      ${blog.title}
      ${blog.author} | ${formatDate(blog.date)} | ${blog.readTime}
      
      ${blog.description}
      
      ${stripHtml(blogContent)}
      
      This content was generated by AI Content Generator.
    `

    const blob = new Blob([blogText], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${blog.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
          <div className="flex gap-6 md:gap-10">
            <Link href="/" className="flex items-center space-x-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <span className="inline-block font-bold">AI Content Generator</span>
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-4">
            <nav className="flex items-center space-x-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>
              <Link href="/login">
                <Button size="sm">Sign Up</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 bg-white">
        <article className="max-w-4xl mx-auto px-4 py-12">
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <Link href="/blog">
                <Button variant="ghost" size="sm" className="gap-1">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Blogs
                </Button>
              </Link>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadBlogContent} className="gap-1">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                <Link href="/login">
                  <Button size="sm" className="gap-1">
                    <ArrowRight className="h-4 w-4" />
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            </div>

            <div className="inline-block px-3 py-1 mb-4 text-xs font-medium bg-primary/10 text-primary rounded-full">
              {blog.category}
            </div>

            <h1 className="text-4xl font-bold mb-6 text-gray-900 leading-tight">{blog.title}</h1>

            <div className="flex items-center gap-6 text-sm text-gray-600 mb-8">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-medium">
                  {blog.author.charAt(0)}
                </div>
                <span>{blog.author}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>{formatDate(blog.date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span>{blog.readTime}</span>
              </div>
            </div>

            <div className="w-full h-[400px] rounded-xl overflow-hidden mb-10">
              <img src={blog.image || "/placeholder.svg"} alt={blog.title} className="w-full h-full object-cover" />
            </div>
          </div>

          {isLoading ? (
            <div className="prose max-w-none animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6 mb-6"></div>

              <div className="h-5 bg-gray-200 rounded w-1/2 mb-4 mt-8"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-4/5 mb-6"></div>

              <div className="h-5 bg-gray-200 rounded w-2/3 mb-4 mt-8"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-6"></div>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-md mb-6">
                  {error}
                </div>
              )}
              <div className="prose max-w-none">
                <div
                  dangerouslySetInnerHTML={{
                    __html: `<p class="my-4 text-gray-700 leading-relaxed">${blogContent}</p>`,
                  }}
                  className="text-lg"
                />
              </div>
            </>
          )}

          <div className="mt-12 p-8 bg-gray-50 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-center text-gray-600 italic">
              Thank you for reading this blog. This content was created by our AI to demonstrate the capabilities of our
              platform. Experience the power of AI-generated content for your business by signing up today.
            </p>
            <div className="flex justify-center mt-4">
              <Link href="/login">
                <Button>Try It For Free</Button>
              </Link>
            </div>
          </div>

          <div className="mt-12">
            <h3 className="text-2xl font-bold mb-6">Related Articles</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {blogs
                .filter((relatedBlog) => relatedBlog.id !== blog.id)
                .slice(0, 2)
                .map((relatedBlog) => (
                  <Link key={relatedBlog.id} href={`/blog/${relatedBlog.id}`} className="group">
                    <div className="border border-gray-200 rounded-xl p-4 transition-all duration-200 hover:shadow-md bg-white">
                      <div className="h-40 overflow-hidden rounded-lg mb-4">
                        <img
                          src={relatedBlog.image || "/placeholder.svg"}
                          alt={relatedBlog.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <div className="inline-block px-2 py-1 mb-2 text-xs font-medium bg-primary/10 text-primary rounded-full">
                        {relatedBlog.category}
                      </div>
                      <h4 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                        {relatedBlog.title}
                      </h4>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{relatedBlog.description}</p>
                      <div className="flex justify-between items-center text-sm text-gray-500">
                        <span>{relatedBlog.author}</span>
                        <span className="flex items-center gap-1">
                          Read More <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        </article>
      </main>

      <footer className="w-full py-6 bg-gray-100 border-t border-gray-200">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <span className="font-bold">AI Content Generator</span>
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
