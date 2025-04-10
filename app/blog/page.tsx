import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Sparkles, Calendar } from "lucide-react"
import { formatDate } from "@/lib/utils"

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
    image: "/blog-content-creation_ai-seo-content-generator.jpg?height=400&width=600",
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
    image: "/blog-SEO_ai-seo-content-generator.jpg?height=400&width=600",
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
    image: "/blog-Gen-AI-in-ecomerce-seo-content-generator.jpg?height=400&width=600",
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
    image: "/blog-Ethical-Considerations-ai-seo-content-generator.jpg?height=400&width=600",
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
    image: "/blog-Marketing-ai-seo-content-generator.jpg?height=400&width=600",
  },
]

export default function BlogPage() {
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
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-white to-gray-50">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-start gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-1">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Home
                </Button>
              </Link>
              <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">Our Blog</h1>
              <p className="max-w-[700px] text-gray-500 md:text-xl">
                Insights, tips, and news about AI content generation and digital marketing.
              </p>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 bg-gray-50">
          <div className="container px-4 md:px-6">
            {/* Featured Blog */}
            <div className="mb-16">
              <div className="relative rounded-2xl overflow-hidden shadow-xl">
                <div className="grid md:grid-cols-2">
                  <div className="bg-gradient-to-r from-primary to-indigo-600 p-8 md:p-12 flex items-center">
                    <div className="text-white">
                      <div className="inline-block px-3 py-1 mb-4 text-sm font-medium bg-white/20 rounded-full">
                        Featured
                      </div>
                      <h2 className="text-3xl font-bold mb-4">{blogs[0].title}</h2>
                      <p className="text-lg opacity-90 mb-6">{blogs[0].description}</p>
                      <div className="flex items-center gap-4 text-sm mb-6">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                            {blogs[0].author.charAt(0)}
                          </div>
                          <span>{blogs[0].author}</span>
                        </div>
                        <div>|</div>
                        <div>{formatDate(blogs[0].date)}</div>
                        <div>|</div>
                        <div>{blogs[0].readTime}</div>
                      </div>
                      <Link href={`/blog/${blogs[0].id}`}>
                        <Button className="bg-white text-primary hover:bg-gray-100">Read Article</Button>
                      </Link>
                    </div>
                  </div>
                  <div className="h-64 md:h-auto bg-gray-200">
                    <img
                      src={blogs[0].image || "/placeholder.svg"}
                      alt={blogs[0].title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Blog Grid */}
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {blogs.slice(1).map((blog) => (
                <Link key={blog.id} href={`/blog/${blog.id}`} className="group">
                  <div className="flex flex-col h-full border border-gray-200 rounded-xl overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md bg-white">
                    <div className="h-48 overflow-hidden">
                      <img
                        src={blog.image || "/placeholder.svg"}
                        alt={blog.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="flex-1 p-6">
                      <div className="inline-block px-3 py-1 mb-3 text-xs font-medium bg-primary/10 text-primary rounded-full">
                        {blog.category}
                      </div>
                      <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                        {blog.title}
                      </h3>
                      <p className="text-gray-600 mb-4 line-clamp-2">{blog.description}</p>
                      <div className="flex items-center justify-between text-sm text-gray-500 mt-auto pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                            {blog.author.charAt(0)}
                          </div>
                          <span>{blog.author}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(blog.date)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-16 text-center">
              <Button variant="outline" size="lg">
                Load More Articles
              </Button>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 bg-white">
          <div className="container px-4 md:px-6">
            <div className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-gray-50 p-8 shadow-sm">
              <h2 className="text-2xl font-bold mb-4 text-center">Subscribe to Our Newsletter</h2>
              <p className="text-gray-600 mb-6 text-center">
                Get the latest insights on AI content generation and digital marketing delivered to your inbox.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Button className="bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 border-0">
                  Subscribe
                </Button>
              </div>
            </div>
          </div>
        </section>
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
