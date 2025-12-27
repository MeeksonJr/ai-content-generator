"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Sparkles, Users, Globe, Award, Building, Target, Heart, Rocket, Zap, TrendingUp } from "lucide-react"
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
        <div className="container flex h-14 sm:h-16 items-center space-x-2 sm:justify-between sm:space-x-0 px-4 sm:px-6">
          <div className="flex gap-4 sm:gap-6 md:gap-10">
            <Link href="/" className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              <span className="inline-block font-bold text-sm sm:text-base">AI Content Generator</span>
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
          <div className="flex flex-1 items-center justify-end space-x-2 sm:space-x-4">
            <nav className="hidden md:flex items-center space-x-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="h-9 px-3 sm:px-4">
                  Login
                </Button>
              </Link>
              <Link href="/login">
                <Button size="sm" className="h-9 px-3 sm:px-4">Sign Up</Button>
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
            className="w-full py-12 sm:py-16 md:py-24 lg:py-32 bg-black"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            <div className="container px-4 sm:px-6">
              <motion.div className="flex flex-col items-start gap-3 sm:gap-4" variants={itemVariants}>
                <Link href="/">
                  <Button variant="ghost" size="sm" className="gap-1 h-9">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Back to Home</span>
                    <span className="sm:hidden">Back</span>
                  </Button>
                </Link>
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tighter">About Us</h1>
                <p className="max-w-[700px] text-muted-foreground text-sm sm:text-base md:text-lg lg:text-xl">
                  We're on a mission to revolutionize content creation with the power of artificial intelligence.
                </p>
              </motion.div>
            </div>
          </motion.section>
        )}

        {mounted && (
          <motion.section
            className="w-full py-12 sm:py-16 md:py-24 bg-gray-950"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
          >
            <div className="container px-4 sm:px-6">
              <div className="grid gap-6 sm:gap-8 lg:grid-cols-2 lg:gap-12">
                <motion.div className="space-y-4 sm:space-y-5" variants={itemVariants}>
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-xs sm:text-sm font-medium text-primary mb-4">
                      <Rocket className="h-3 w-3 sm:h-4 sm:w-4" />
                      Our Journey
                    </div>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">Our Story</h2>
                  </div>
                  <div className="space-y-3 sm:space-y-4">
                    <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                      Founded in 2025, AI Content Generator was born from a simple observation: businesses spend countless
                      hours creating content, often struggling with consistency, quality, and scale. We saw an opportunity 
                      to revolutionize how content is created.
                    </p>
                    <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                      Our team of AI specialists, content strategists, and software engineers came together with a shared
                      vision: to build a platform that makes high-quality content creation accessible to businesses of all
                      sizes—from startups to enterprise organizations.
                    </p>
                    <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                      Today, we're proud to serve thousands of customers worldwide, helping them create compelling,
                      SEO-optimized content in seconds rather than hours or days. Our platform has generated over 10 million 
                      words of content and continues to grow every day.
                    </p>
                  </div>
                  
                  {/* Key milestones */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 pt-4 border-t border-gray-800">
                    <div className="text-center p-3 rounded-lg bg-black/50 border border-gray-800">
                      <div className="text-2xl sm:text-3xl font-bold text-primary mb-1">2025</div>
                      <div className="text-xs text-muted-foreground">Founded</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-black/50 border border-gray-800">
                      <div className="text-2xl sm:text-3xl font-bold text-primary mb-1">5K+</div>
                      <div className="text-xs text-muted-foreground">Users</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-black/50 border border-gray-800 col-span-2 sm:col-span-1">
                      <div className="text-2xl sm:text-3xl font-bold text-primary mb-1">10M+</div>
                      <div className="text-xs text-muted-foreground">Words</div>
                    </div>
                  </div>
                </motion.div>
                <motion.div className="space-y-3 sm:space-y-4" variants={itemVariants}>
                  <motion.div
                    className="group rounded-xl border border-gray-800 bg-gradient-to-br from-black/50 to-gray-950/50 p-5 sm:p-6 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
                    whileHover={{ scale: 1.02, y: -2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="p-2.5 sm:p-3 rounded-lg bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                        <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-sm sm:text-base mb-1.5 group-hover:text-primary transition-colors">Our Team</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                          A diverse group of experts passionate about AI and content. From machine learning engineers 
                          to content strategists, we bring together the best talent.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                  <motion.div
                    className="group rounded-xl border border-gray-800 bg-gradient-to-br from-black/50 to-gray-950/50 p-5 sm:p-6 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
                    whileHover={{ scale: 1.02, y: -2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="p-2.5 sm:p-3 rounded-lg bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                        <Globe className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-sm sm:text-base mb-1.5 group-hover:text-primary transition-colors">Global Reach</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                          Serving customers in over 50 countries around the world. Our platform supports multiple 
                          languages and time zones.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                  <motion.div
                    className="group rounded-xl border border-gray-800 bg-gradient-to-br from-black/50 to-gray-950/50 p-5 sm:p-6 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
                    whileHover={{ scale: 1.02, y: -2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="p-2.5 sm:p-3 rounded-lg bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                        <Award className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-sm sm:text-base mb-1.5 group-hover:text-primary transition-colors">Award-Winning</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                          Recognized for innovation in AI and content technology. Winner of the 2025 AI Innovation Award 
                          for Best Content Generation Platform.
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
            className="w-full py-12 sm:py-16 md:py-24 bg-black"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
          >
            <div className="container px-4 sm:px-6">
              <div className="mx-auto max-w-3xl text-center">
                <motion.div variants={itemVariants} className="mb-6 sm:mb-8">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-xs sm:text-sm font-medium text-primary mb-4">
                    <Heart className="h-3 w-3 sm:h-4 sm:w-4" />
                    What We Stand For
                  </div>
                  <motion.h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6" variants={itemVariants}>
                    Our Values
                  </motion.h2>
                </motion.div>
                <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 md:grid-cols-3">
                  {[
                    {
                      title: "Innovation",
                      description: "We're constantly pushing the boundaries of what's possible with AI. Every feature we build is designed to solve real problems.",
                      icon: <Zap className="h-5 w-5 sm:h-6 sm:w-6" />,
                      color: "from-yellow-500 to-orange-500",
                    },
                    {
                      title: "Quality",
                      description: "We're committed to delivering the highest quality content generation tools. Excellence is not optional—it's our standard.",
                      icon: <Award className="h-5 w-5 sm:h-6 sm:w-6" />,
                      color: "from-blue-500 to-cyan-500",
                    },
                    {
                      title: "Accessibility",
                      description: "We believe powerful AI tools should be accessible to businesses of all sizes. From startups to enterprises, everyone deserves great content.",
                      icon: <Target className="h-5 w-5 sm:h-6 sm:w-6" />,
                      color: "from-green-500 to-emerald-500",
                    },
                  ].map((value, index) => (
                    <motion.div
                      key={index}
                      className="group rounded-xl border border-gray-800 bg-gradient-to-br from-gray-950 to-black p-5 sm:p-6 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 relative overflow-hidden"
                      variants={itemVariants}
                      whileHover={{ scale: 1.05, y: -5 }}
                      transition={{ duration: 0.2 }}
                    >
                      {/* Decorative background */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${value.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
                      
                      <div className="relative z-10">
                        <div className={`mb-4 p-3 rounded-lg bg-gradient-to-br ${value.color} opacity-90 group-hover:opacity-100 transition-opacity w-fit`}>
                          <div className="text-white">
                            {value.icon}
                          </div>
                        </div>
                        <h3 className="font-bold mb-2 sm:mb-3 text-base sm:text-lg group-hover:text-primary transition-colors">
                          {value.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                          {value.description}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {mounted && (
          <motion.section
            className="w-full py-12 sm:py-16 md:py-24 bg-gray-950"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
          >
            <div className="container px-4 sm:px-6">
              <div className="mx-auto max-w-3xl text-center">
                <motion.div variants={itemVariants} className="mb-6 sm:mb-8">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-xs sm:text-sm font-medium text-primary mb-4">
                    <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                    Meet the Team
                  </div>
                  <motion.h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6" variants={itemVariants}>
                    Leadership Team
                  </motion.h2>
                  <p className="text-muted-foreground text-sm sm:text-base mb-6 leading-relaxed">
                    Our leadership team brings decades of combined experience in AI, content strategy, and software engineering.
                  </p>
                </motion.div>
                <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 md:grid-cols-3">
                  {[
                    { name: "Mohamed Datt", role: "CEO & Co-Founder", bio: "Visionary leader with 10+ years in AI and SaaS" },
                    { name: "Mohamed Datt", role: "CTO & Co-Founder", bio: "Expert in machine learning and scalable systems" },
                    { name: "Mohamed Datt", role: "Chief AI Officer", bio: "Pioneer in natural language processing" },
                  ].map((member, index) => (
                    <motion.div
                      key={index}
                      className="group rounded-xl border border-gray-800 bg-gradient-to-br from-black/50 to-gray-950/50 p-5 sm:p-6 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10"
                      variants={itemVariants}
                      whileHover={{ scale: 1.05, y: -5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-gradient-to-br from-primary/20 via-indigo-600/20 to-purple-600/20 mx-auto mb-4 sm:mb-5 flex items-center justify-center border-2 border-primary/30 group-hover:border-primary/60 transition-colors shadow-lg group-hover:shadow-primary/20">
                        <Building className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                      </div>
                      <h3 className="font-bold text-base sm:text-lg mb-1 text-center group-hover:text-primary transition-colors">
                        {member.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-primary mb-2 text-center font-medium">
                        {member.role}
                      </p>
                      <p className="text-xs text-muted-foreground text-center leading-relaxed">
                        {member.bio}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {mounted && (
          <motion.section
            className="w-full py-12 sm:py-16 md:py-24 bg-black"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
          >
            <div className="container px-4 sm:px-6">
              <div className="mx-auto max-w-3xl text-center">
                <motion.div variants={itemVariants} className="mb-6 sm:mb-8">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-xs sm:text-sm font-medium text-primary mb-4">
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                    We're Hiring
                  </div>
                  <motion.h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6" variants={itemVariants}>
                    Join The Team
                  </motion.h2>
                  <motion.p className="text-muted-foreground text-sm sm:text-base mb-4 sm:mb-6 px-4 leading-relaxed" variants={itemVariants}>
                    We're always looking for talented individuals who are passionate about AI, content, and building
                    innovative products. If you're excited about the future of content creation, we'd love to hear from you.
                  </motion.p>
                </motion.div>
                <motion.div 
                  className="rounded-xl border border-gray-800 bg-gradient-to-br from-black/50 to-gray-950/50 p-6 sm:p-8"
                  variants={itemVariants}
                >
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-center sm:text-left">
                      <h3 className="text-lg sm:text-xl font-bold mb-2">Open Positions Available</h3>
                      <p className="text-sm text-muted-foreground">
                        Check out our careers page to see current openings
                      </p>
                    </div>
                    <Link href="/careers">
                      <Button className="gap-2 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 border-0 h-11 sm:h-12 text-sm sm:text-base font-semibold shadow-lg hover:shadow-xl hover:shadow-primary/30 transition-all px-6 sm:px-8">
                        View Open Positions
                        <ArrowLeft className="h-4 w-4 rotate-180" />
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.section>
        )}
      </main>
      <footer className="w-full py-6 sm:py-8 bg-gray-950 border-t border-gray-800">
        <div className="container px-4 sm:px-6">
          <div className="flex flex-col items-center justify-center space-y-3 sm:space-y-4 text-center">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              <span className="font-bold text-sm sm:text-base">AI Content Generator</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              © {new Date().getFullYear()} AI Content Generator. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
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
