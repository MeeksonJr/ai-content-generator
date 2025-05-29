"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"

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

export default function DebugBlogPage() {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBlogPosts()
  }, [])

  const fetchBlogPosts = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log("Fetching blog posts for debug...")

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

  const testBlogPost = async (id: string) => {
    try {
      console.log("Testing blog post with ID:", id)
      const response = await fetch(`/api/blog/${id}`)
      console.log("Test response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("Test response data:", data)
        alert(`Success! Blog post found: ${data.post?.title}`)
      } else {
        const errorData = await response.text()
        console.error("Test error:", errorData)
        alert(`Error ${response.status}: ${errorData}`)
      }
    } catch (error) {
      console.error("Test error:", error)
      alert(`Error: ${error}`)
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  if (error) {
    return <div className="p-8 text-red-600">Error: {error}</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Debug Blog Posts</h1>

      <div className="space-y-4">
        {blogPosts.map((post) => (
          <div key={post.id} className="border p-4 rounded">
            <h3 className="font-bold">{post.title}</h3>
            <p className="text-sm text-gray-600">ID: {post.id}</p>
            <p className="text-sm text-gray-600">Slug: {post.slug}</p>
            <div className="mt-2 space-x-2">
              <Button onClick={() => testBlogPost(post.id)} size="sm">
                Test API Call
              </Button>
              <Button onClick={() => window.open(`/blog/${post.id}`, "_blank")} size="sm" variant="outline">
                Open Blog Post
              </Button>
            </div>
          </div>
        ))}
      </div>

      {blogPosts.length === 0 && <p className="text-gray-600">No blog posts found.</p>}
    </div>
  )
}
