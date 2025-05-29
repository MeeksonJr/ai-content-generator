"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Sparkles, FileText, Search } from "lucide-react"

export default function BlogNotFound() {
  const params = useParams()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const id = params.id as string

  const handleGenerateContent = (e: React.FormEvent) => {
    e.preventDefault()
    const query = searchQuery.trim()
    if (query) {
      router.push(`/blog-search?q=${encodeURIComponent(query)}`)
    } else {
      router.push("/blog-search")
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
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-blue-50 to-white">
          <div className="container px-4 md:px-6">
            <div className="max-w-2xl mx-auto text-center">
              <Link href="/blog" className="inline-block mb-6">
                <Button variant="ghost" size="sm" className="gap-1 text-gray-600 hover:text-gray-900">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Blog
                </Button>
              </Link>

              <Card className="bg-white border-gray-200 shadow-lg">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                    <FileText className="h-8 w-8 text-red-600" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-gray-900">Blog Post Not Found</CardTitle>
                  <CardDescription className="text-gray-600">
                    The blog post you're looking for doesn't exist or has been removed.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center">
                    <p className="text-gray-600 mb-4">Would you like us to generate a comprehensive guide using AI?</p>
                  </div>

                  {/* Search Input Form */}
                  <form onSubmit={handleGenerateContent} className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Enter the topic you'd like to generate content about..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-12 text-base bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                      />
                    </div>

                    <div className="flex gap-3 justify-center">
                      <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" size="lg">
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Content
                      </Button>
                      <Link href="/blog">
                        <Button variant="outline" size="lg" className="border-gray-300">
                          Browse Blog
                        </Button>
                      </Link>
                    </div>
                  </form>

                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-blue-800 text-sm">
                      💡 <strong>Quick tip:</strong> Enter any topic you'd like to explore and we'll generate a
                      comprehensive guide for you using AI.
                    </p>
                  </div>
                </CardContent>
              </Card>
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
          </div>
        </div>
      </footer>
    </div>
  )
}
