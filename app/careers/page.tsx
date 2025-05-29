import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Sparkles, ArrowRight, Building, MapPin, Clock } from "lucide-react"

export default function CareersPage() {
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
        <section className="w-full py-12 md:py-24 lg:py-32 bg-black">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-start gap-4">
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
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 bg-gray-950">
          <div className="container px-4 md:px-6">
            <div className="mx-auto max-w-3xl space-y-8">
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Why Work With Us</h2>
                <p className="text-muted-foreground">
                  At AI Content Generator, we're building the future of content creation. We're a team of passionate
                  engineers, designers, and content specialists working together to make high-quality content creation
                  accessible to businesses of all sizes.
                </p>
                <div className="grid gap-4 md:grid-cols-3 mt-6">
                  <div className="rounded-lg border border-gray-800 bg-black/50 p-4">
                    <h3 className="font-bold mb-2">Innovative Technology</h3>
                    <p className="text-sm text-muted-foreground">
                      Work with cutting-edge AI models and technologies to solve real-world problems.
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-800 bg-black/50 p-4">
                    <h3 className="font-bold mb-2">Remote-First</h3>
                    <p className="text-sm text-muted-foreground">
                      Work from anywhere in the world with our distributed team.
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-800 bg-black/50 p-4">
                    <h3 className="font-bold mb-2">Competitive Benefits</h3>
                    <p className="text-sm text-muted-foreground">
                      Enjoy competitive salary, equity, health insurance, and unlimited PTO.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Open Positions</h2>
                <div className="grid gap-4">
                  {jobOpenings.map((job, index) => (
                    <div key={index} className="rounded-lg border border-gray-800 bg-black/50 p-6">
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
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Our Hiring Process</h2>
                <div className="space-y-4">
                  <div className="rounded-lg border border-gray-800 bg-black/50 p-4">
                    <h3 className="font-bold mb-2">1. Application Review</h3>
                    <p className="text-sm text-muted-foreground">
                      We review your application and resume to see if your skills and experience match the role.
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-800 bg-black/50 p-4">
                    <h3 className="font-bold mb-2">2. Initial Interview</h3>
                    <p className="text-sm text-muted-foreground">
                      A 30-minute video call with a member of our team to discuss your background, experience, and
                      interest in the role.
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-800 bg-black/50 p-4">
                    <h3 className="font-bold mb-2">3. Technical Assessment</h3>
                    <p className="text-sm text-muted-foreground">
                      Depending on the role, you may be asked to complete a technical assessment or case study to
                      demonstrate your skills.
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-800 bg-black/50 p-4">
                    <h3 className="font-bold mb-2">4. Team Interviews</h3>
                    <p className="text-sm text-muted-foreground">
                      Meet with several members of our team to discuss your experience in more depth and learn more
                      about the role.
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-800 bg-black/50 p-4">
                    <h3 className="font-bold mb-2">5. Final Decision</h3>
                    <p className="text-sm text-muted-foreground">
                      We'll make a decision and extend an offer to the successful candidate.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-800 bg-black/50 p-6 text-center">
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
              </div>
            </div>
          </div>
        </section>
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
