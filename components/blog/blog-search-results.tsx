"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar, Clock, Eye, Tag, Search, Sparkles } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  category: string
  author: string
  image_url?: string
  tags: string[]
  read_time: string
  view_count: number
  created_at: string
}

interface BlogSearchResultsProps {
  searchQuery: string
  onClear: () => void
}

export function BlogSearchResults({ searchQuery, onClear }: BlogSearchResultsProps) {
  const [results, setResults] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    const searchTimeout = setTimeout(async () => {
      setLoading(true)
      setError(null)
      
      try {
        const response = await fetch(`/api/blog-posts?search=${encodeURIComponent(searchQuery.trim())}&limit=6`)
        
        if (!response.ok) {
          throw new Error("Failed to search blog posts")
        }
        
        const data = await response.json()
        setResults(data.results || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to search")
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300) // Debounce 300ms

    return () => clearTimeout(searchTimeout)
  }, [searchQuery])

  if (!searchQuery.trim()) {
    return null
  }

  if (loading) {
    return (
      <div className="mt-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Search Results</h3>
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="border border-border">
              <Skeleton className="h-48 w-full" />
              <CardHeader>
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-full" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-4 p-4 rounded-lg border border-destructive/50 bg-destructive/10">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Search Results for &quot;{searchQuery}&quot;
        </h3>
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
      </div>
      
      {results.length > 0 ? (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((post) => (
              <Link key={post.id} href={`/blog/${post.id}`} className="group">
                <Card className="h-full border border-border transition-all duration-300 shadow-sm hover:shadow-lg hover:border-primary/50 hover:-translate-y-1 bg-card overflow-hidden">
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
                        {post.tags.slice(0, 3).map((tagItem, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-muted text-foreground rounded-md border border-border hover:bg-muted/80 transition-colors"
                          >
                            <Tag className="h-3 w-3" />
                            {tagItem}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          {results.length >= 6 && (
            <div className="text-center pt-4">
              <Link href={`/blog-search?q=${encodeURIComponent(searchQuery)}`}>
                <Button variant="outline">
                  <Search className="h-4 w-4 mr-2" />
                  View All Results
                </Button>
              </Link>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8 rounded-lg border border-border bg-muted/30">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Search className="h-6 w-6 text-primary" />
          </div>
          <h4 className="text-lg font-semibold mb-2">No results found</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Try different keywords or generate new content
          </p>
          <Link href={`/blog-search?q=${encodeURIComponent(searchQuery)}`}>
            <Button>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Content
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}

