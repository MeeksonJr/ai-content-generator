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
              <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">Join Our Team</h1>
              <p className="max-w-[700px] text-muted-foreground md:text-xl">
                Help us revolutionize content creation with the power of artificial intelligence.
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
            <div className="mx-auto max-w-3xl space-y-8">
                <motion.div className="space-y-4" variants={itemVariants}>
                <h2 className="text-2xl font-bold">Why Work With Us</h2>
                <p className="text-muted-foreground">
                  At AI Content Generator, we're building the future of content creation. We're a team of passionate
                  engineers, designers, and content specialists working together to make high-quality content creation
                  accessible to businesses of all sizes.
                </p>
                <div className="grid gap-4 md:grid-cols-3 mt-6">
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
                        className="rounded-lg border border-gray-800 bg-black/50 p-4 hover:border-primary/50 transition-colors"
                        variants={itemVariants}
                        whileHover={{ scale: 1.05, y: -5 }}
                        transition={{ duration: 0.2 }}
                      >
                        <h3 className="font-bold mb-2">{benefit.title}</h3>
                        <p className="text-sm text-muted-foreground">{benefit.description}</p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                <motion.div className="space-y-4" variants={itemVariants}>
                <h2 className="text-2xl font-bold">Open Positions</h2>
                <div className="grid gap-4">
                  {jobOpenings.map((job, index) => (
                      <motion.div
                        key={index}
                        className="rounded-lg border border-gray-800 bg-black/50 p-6 hover:border-primary/50 transition-colors"
                        variants={itemVariants}
                        whileHover={{ scale: 1.02, x: 5 }}
                        transition={{ duration: 0.2 }}
                      >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-bold">{job.title}</h3>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Building className="mr-1 h-3 w-3" />
                              {job.department}
                            </div>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <MapPin className="mr-1 h-3 w-3" />
                              {job.location}
                            </div>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Clock className="mr-1 h-3 w-3" />
                              {job.type}
                            </div>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">{job.description}</p>
                        </div>
                        <div className="flex-shrink-0">
                          <Link href={`/careers/apply?position=${encodeURIComponent(job.title)}`}>
                            <Button className="gap-1 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 border-0">
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

                <motion.div className="space-y-4" variants={itemVariants}>
                <h2 className="text-2xl font-bold">Our Hiring Process</h2>
                <div className="space-y-4">
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
                        className="rounded-lg border border-gray-800 bg-black/50 p-4 hover:border-primary/50 transition-colors"
                        variants={itemVariants}
                        whileHover={{ scale: 1.02, x: 5 }}
                        transition={{ duration: 0.2 }}
                      >
                        <h3 className="font-bold mb-2">{process.step}</h3>
                        <p className="text-sm text-muted-foreground">{process.description}</p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                <motion.div
                  className="rounded-lg border border-gray-800 bg-black/50 p-6 text-center hover:border-primary/50 transition-colors"
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                <h2 className="text-2xl font-bold mb-4">Don't See a Role That Fits?</h2>
                <p className="text-muted-foreground mb-6">
                  We're always looking for talented individuals to join our team. Send us your resume and we'll keep you
                  in mind for future opportunities.
                </p>
                <Link href="/careers/apply">
                  <Button className="gap-1 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 border-0">
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
