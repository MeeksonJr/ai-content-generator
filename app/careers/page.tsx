"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Sparkles, ArrowRight, Building, MapPin, Clock } from "lucide-react"
import { BlogMobileMenu } from "@/components/blog/blog-mobile-menu"
import { motion } from "framer-motion"

export default function CareersPage() {
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

  const jobOpenings = [
    {
      title: "Senior AI Engineer",
      department: "Engineering",
      location: "Remote",
      type: "Full-time",
      description:
        "We're looking for a Senior AI Engineer to help us build and improve our AI content generation models.",
    },
    {
      title: "Frontend Developer",
      department: "Engineering",
      location: "San Francisco, CA",
      type: "Full-time",
      description:
        "Join our team to build beautiful, responsive, and accessible user interfaces for our AI content platform.",
    },
    {
      title: "Content Marketing Specialist",
      department: "Marketing",
      location: "Remote",
      type: "Full-time",
      description: "Help us create compelling content that showcases the power of our AI content generation platform.",
    },
    {
      title: "Customer Success Manager",
      department: "Customer Success",
      location: "New York, NY",
      type: "Full-time",
      description:
        "Work directly with our customers to ensure they get the most value from our AI content generation platform.",
    },
    {
      title: "Product Manager",
      department: "Product",
      location: "Remote",
      type: "Full-time",
      description:
        "Drive the product roadmap for our AI content generation platform, working closely with engineering and design teams.",
    },
    {
      title: "Sales Development Representative",
      department: "Sales",
      location: "Remote",
      type: "Full-time",
      description:
        "Help us grow our customer base by identifying and reaching out to potential customers for our AI content platform.",
    },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      <header className="sticky top-0 z-40 w-full border-b border-gray-800 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/60 shadow-sm">
        <div className="container flex h-14 sm:h-16 items-center space-x-2 sm:justify-between sm:space-x-0 px-4 sm:px-6">
          <div className="flex gap-4 sm:gap-6 md:gap-10">
            <Link href="/" className="flex items-center space-x-2 group">
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary group-hover:scale-110 transition-transform" />
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
                className="flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                About
              </Link>
              <Link
                href="/careers"
                className="flex items-center text-sm font-medium text-foreground transition-colors"
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
            className="w-full py-8 sm:py-12 md:py-16 lg:py-24 bg-black relative overflow-hidden"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
          {/* Decorative background */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary rounded-full blur-3xl"></div>
          </div>
          <div className="container relative z-10 px-4 sm:px-6">
              <motion.div className="flex flex-col items-start gap-3 sm:gap-4" variants={itemVariants}>
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-1 h-9 group">
                  <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                  <span className="hidden sm:inline">Back to Home</span>
                  <span className="sm:hidden">Back</span>
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tighter mb-2 sm:mb-3">
                  Join Our Team
                </h1>
                <p className="max-w-[700px] text-muted-foreground text-sm sm:text-base md:text-lg lg:text-xl leading-relaxed">
                  Help us revolutionize content creation with the power of artificial intelligence.
                </p>
              </div>
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
            <div className="mx-auto max-w-3xl space-y-6 sm:space-y-8">
                <motion.div className="space-y-3 sm:space-y-4" variants={itemVariants}>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">Why Work With Us</h2>
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                  At AI Content Generator, we're building the future of content creation. We're a team of passionate
                  engineers, designers, and content specialists working together to make high-quality content creation
                  accessible to businesses of all sizes.
                </p>
                <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 mt-4 sm:mt-6">
                    {[
                      {
                        title: "Innovative Technology",
                        description: "Work with cutting-edge AI models and technologies to solve real-world problems.",
                      },
                      {
                        title: "Remote-First",
                        description: "Work from anywhere in the world with our distributed team.",
                      },
                      {
                        title: "Competitive Benefits",
                        description: "Enjoy competitive salary, equity, health insurance, and unlimited PTO.",
                      },
                    ].map((benefit, index) => (
                      <motion.div
                        key={index}
                        className="rounded-lg border border-gray-800 bg-black/50 p-4 sm:p-6 hover:border-primary/50 transition-colors"
                        variants={itemVariants}
                        whileHover={{ scale: 1.05, y: -5 }}
                        transition={{ duration: 0.2 }}
                      >
                        <h3 className="font-bold mb-2 text-sm sm:text-base">{benefit.title}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{benefit.description}</p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                <motion.div className="space-y-3 sm:space-y-4" variants={itemVariants}>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">Open Positions</h2>
                <p className="text-muted-foreground text-sm sm:text-base mb-4 sm:mb-6">
                  We're always looking for talented individuals to join our growing team. Explore our current openings below.
                </p>
                <div className="grid gap-4 sm:gap-6">
                  {jobOpenings.map((job, index) => (
                      <motion.div
                        key={index}
                        className="rounded-lg border border-gray-800 bg-black/50 p-4 sm:p-6 hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-lg"
                        variants={itemVariants}
                        whileHover={{ scale: 1.01, x: 2 }}
                        transition={{ duration: 0.2 }}
                      >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 sm:mb-3">{job.title}</h3>
                          <div className="flex flex-wrap gap-2 sm:gap-3 mb-3 sm:mb-4">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-gray-900 rounded-full text-muted-foreground border border-gray-800">
                              <Building className="h-3 w-3" />
                              {job.department}
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-gray-900 rounded-full text-muted-foreground border border-gray-800">
                              <MapPin className="h-3 w-3" />
                              {job.location}
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-gray-900 rounded-full text-muted-foreground border border-gray-800">
                              <Clock className="h-3 w-3" />
                              {job.type}
                            </div>
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{job.description}</p>
                        </div>
                        <div className="flex-shrink-0">
                          <Link href={`/careers/apply?position=${encodeURIComponent(job.title)}`}>
                            <Button className="gap-1 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 border-0 w-full md:w-auto h-10 sm:h-11 text-sm sm:text-base shadow-md hover:shadow-lg transition-all">
                              Apply Now
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                      </motion.div>
                  ))}
                </div>
                </motion.div>

                <motion.div className="space-y-3 sm:space-y-4" variants={itemVariants}>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">Our Hiring Process</h2>
                <p className="text-muted-foreground text-sm sm:text-base mb-4 sm:mb-6">
                  We've designed our hiring process to be transparent, efficient, and respectful of your time.
                </p>
                <div className="space-y-3 sm:space-y-4">
                    {[
                      {
                        step: "1. Application Review",
                        description:
                          "We review your application and resume to see if your skills and experience match the role.",
                      },
                      {
                        step: "2. Initial Interview",
                        description:
                          "A 30-minute video call with a member of our team to discuss your background, experience, and interest in the role.",
                      },
                      {
                        step: "3. Technical Assessment",
                        description:
                          "Depending on the role, you may be asked to complete a technical assessment or case study to demonstrate your skills.",
                      },
                      {
                        step: "4. Team Interviews",
                        description:
                          "Meet with several members of our team to discuss your experience in more depth and learn more about the role.",
                      },
                      {
                        step: "5. Final Decision",
                        description: "We'll make a decision and extend an offer to the successful candidate.",
                      },
                    ].map((process, index) => (
                      <motion.div
                        key={index}
                        className="rounded-lg border border-gray-800 bg-black/50 p-4 sm:p-6 hover:border-primary/50 transition-all duration-300"
                        variants={itemVariants}
                        whileHover={{ scale: 1.01, x: 2 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="flex items-start gap-3 sm:gap-4">
                          <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm sm:text-base">
                            {index + 1}
                          </div>
                          <div>
                            <h3 className="font-bold mb-2 text-sm sm:text-base">{process.step}</h3>
                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{process.description}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                <motion.div
                  className="rounded-lg border border-gray-800 bg-gradient-to-br from-black/50 to-gray-900/50 p-6 sm:p-8 text-center hover:border-primary/50 transition-all duration-300"
                  variants={itemVariants}
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                >
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4">Don't See a Role That Fits?</h2>
                <p className="text-muted-foreground text-sm sm:text-base mb-4 sm:mb-6 leading-relaxed">
                  We're always looking for talented individuals to join our team. Send us your resume and we'll keep you
                  in mind for future opportunities.
                </p>
                <Link href="/careers/apply">
                  <Button className="gap-1 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 border-0 h-10 sm:h-11 px-6 sm:px-8 text-sm sm:text-base shadow-md hover:shadow-lg transition-all">
                    Send Your Resume
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                </motion.div>
              </div>
            </div>
          </motion.section>
        )}
      </main>
      <footer className="w-full py-8 sm:py-10 bg-gray-950 border-t border-gray-800">
        <div className="container px-4 sm:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 sm:space-y-5 text-center">
            <Link href="/" className="flex items-center space-x-2 group">
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary group-hover:scale-110 transition-transform" />
              <span className="font-bold text-sm sm:text-base">AI Content Generator</span>
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
