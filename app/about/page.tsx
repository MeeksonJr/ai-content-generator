"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Sparkles, Users, Globe, Award, Building } from "lucide-react"
import { BlogMobileMenu } from "@/components/blog/blog-mobile-menu"
import { motion } from "framer-motion"

export default function AboutPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  }

  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      <header className="sticky top-0 z-40 w-full border-b border-gray-800 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/60">
        <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
          <div className="flex gap-6 md:gap-10">
            <Link href="/" className="flex items-center space-x-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <span className="inline-block font-bold">AI Content Generator</span>
            </Link>
            <nav className="hidden md:flex gap-6">
              <Link
                href="/blog"
                className="flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Blog
              </Link>
              <Link
                href="/about"
                className="flex items-center text-sm font-medium text-foreground transition-colors"
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
          <div className="flex flex-1 items-center justify-end space-x-4">
            <nav className="hidden md:flex items-center space-x-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>
              <Link href="/login">
                <Button size="sm">Sign Up</Button>
              </Link>
            </nav>
            <div className="md:hidden">
              <BlogMobileMenu />
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1">
        {mounted && (
          <motion.section
            className="w-full py-12 md:py-24 lg:py-32 bg-black"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            <div className="container px-4 md:px-6">
              <motion.div className="flex flex-col items-start gap-4" variants={itemVariants}>
                <Link href="/">
                  <Button variant="ghost" size="sm" className="gap-1">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Home
                  </Button>
                </Link>
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">About Us</h1>
                <p className="max-w-[700px] text-muted-foreground md:text-xl">
                  We're on a mission to revolutionize content creation with the power of artificial intelligence.
                </p>
              </motion.div>
            </div>
          </motion.section>
        )}

        {mounted && (
          <motion.section
            className="w-full py-12 md:py-24 bg-gray-950"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
          >
            <div className="container px-4 md:px-6">
              <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
                <motion.div className="space-y-4" variants={itemVariants}>
                  <h2 className="text-3xl font-bold">Our Story</h2>
                  <p className="text-muted-foreground">
                    Founded in 2025, AI Content Generator was born from a simple observation: businesses spend countless
                    hours creating content, often struggling with consistency, quality, and scale.
                  </p>
                  <p className="text-muted-foreground">
                    Our team of AI specialists, content strategists, and software engineers came together with a shared
                    vision: to build a platform that makes high-quality content creation accessible to businesses of all
                    sizes.
                  </p>
                  <p className="text-muted-foreground">
                    Today, we're proud to serve thousands of customers worldwide, helping them create compelling,
                    SEO-optimized content in seconds rather than hours or days.
                  </p>
                </motion.div>
                <motion.div className="space-y-4" variants={itemVariants}>
                  <motion.div
                    className="rounded-lg border border-gray-800 bg-black/50 p-6 hover:border-primary/50 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center gap-4">
                      <Users className="h-8 w-8 text-primary" />
                      <div>
                        <h3 className="font-bold">Our Team</h3>
                        <p className="text-sm text-muted-foreground">
                          A diverse group of experts passionate about AI and content
                        </p>
                      </div>
                    </div>
                  </motion.div>
                  <motion.div
                    className="rounded-lg border border-gray-800 bg-black/50 p-6 hover:border-primary/50 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center gap-4">
                      <Globe className="h-8 w-8 text-primary" />
                      <div>
                        <h3 className="font-bold">Global Reach</h3>
                        <p className="text-sm text-muted-foreground">
                          Serving customers in over 50 countries around the world
                        </p>
                      </div>
                    </div>
                  </motion.div>
                  <motion.div
                    className="rounded-lg border border-gray-800 bg-black/50 p-6 hover:border-primary/50 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center gap-4">
                      <Award className="h-8 w-8 text-primary" />
                      <div>
                        <h3 className="font-bold">Award-Winning</h3>
                        <p className="text-sm text-muted-foreground">
                          Recognized for innovation in AI and content technology
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </motion.section>
        )}

        {mounted && (
          <motion.section
            className="w-full py-12 md:py-24 bg-black"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
          >
            <div className="container px-4 md:px-6">
              <div className="mx-auto max-w-3xl text-center">
                <motion.h2 className="text-3xl font-bold mb-6" variants={itemVariants}>
                  Our Values
                </motion.h2>
                <div className="grid gap-6 md:grid-cols-3">
                  {[
                    {
                      title: "Innovation",
                      description: "We're constantly pushing the boundaries of what's possible with AI.",
                    },
                    {
                      title: "Quality",
                      description: "We're committed to delivering the highest quality content generation tools.",
                    },
                    {
                      title: "Accessibility",
                      description: "We believe powerful AI tools should be accessible to businesses of all sizes.",
                    },
                  ].map((value, index) => (
                    <motion.div
                      key={index}
                      className="rounded-lg border border-gray-800 bg-gray-950 p-6 hover:border-primary/50 transition-colors"
                      variants={itemVariants}
                      whileHover={{ scale: 1.05, y: -5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <h3 className="font-bold mb-2">{value.title}</h3>
                      <p className="text-sm text-muted-foreground">{value.description}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {mounted && (
          <motion.section
            className="w-full py-12 md:py-24 bg-gray-950"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
          >
            <div className="container px-4 md:px-6">
              <div className="mx-auto max-w-3xl text-center">
                <motion.h2 className="text-3xl font-bold mb-6" variants={itemVariants}>
                  Leadership Team
                </motion.h2>
                <div className="grid gap-6 md:grid-cols-3">
                  {[
                    { name: "Mohamed Datt", role: "CEO & Co-Founder" },
                    { name: "Mohamed Datt", role: "CTO & Co-Founder" },
                    { name: "Mohamed Datt", role: "Chief AI Officer" },
                  ].map((member, index) => (
                    <motion.div
                      key={index}
                      className="rounded-lg border border-gray-800 bg-black/50 p-6 hover:border-primary/50 transition-colors"
                      variants={itemVariants}
                      whileHover={{ scale: 1.05, y: -5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/20 to-indigo-600/20 mx-auto mb-4 flex items-center justify-center border border-primary/30">
                        <Building className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="font-bold">{member.name}</h3>
                      <p className="text-sm text-muted-foreground">{member.role}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {mounted && (
          <motion.section
            className="w-full py-12 md:py-24 bg-black"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
          >
            <div className="container px-4 md:px-6">
              <div className="mx-auto max-w-3xl text-center">
                <motion.h2 className="text-3xl font-bold mb-6" variants={itemVariants}>
                  Join The Team
                </motion.h2>
                <motion.p className="text-muted-foreground mb-6" variants={itemVariants}>
                  We're always looking for talented individuals who are passionate about AI, content, and building
                  innovative products.
                </motion.p>
                <motion.div variants={itemVariants}>
                  <Link href="/careers">
                    <Button className="gap-1 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 border-0">
                      View Open Positions
                      <ArrowLeft className="h-4 w-4 rotate-180" />
                    </Button>
                  </Link>
                </motion.div>
              </div>
            </div>
          </motion.section>
        )}
      </main>
      <footer className="w-full py-6 bg-gray-950 border-t border-gray-800">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <span className="font-bold">AI Content Generator</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} AI Content Generator. All rights reserved.
            </p>
            <div className="flex space-x-4">
              <Link href="/privacy" className="text-xs text-muted-foreground hover:text-foreground">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-xs text-muted-foreground hover:text-foreground">
                Terms of Service
              </Link>
              <Link href="/cookies" className="text-xs text-muted-foreground hover:text-foreground">
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
