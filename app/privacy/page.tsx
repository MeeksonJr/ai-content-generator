import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Sparkles } from "lucide-react"

export default function PrivacyPolicyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      <header className="sticky top-0 z-40 w-full border-b border-gray-800 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/60 shadow-sm">
        <div className="container flex h-14 sm:h-16 items-center space-x-2 sm:justify-between sm:space-x-0 px-4 sm:px-6">
          <div className="flex gap-4 sm:gap-6 md:gap-10">
            <Link href="/" className="flex items-center space-x-2 group">
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary group-hover:scale-110 transition-transform" />
              <span className="inline-block font-bold text-sm sm:text-base">AI Content Generator</span>
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-2 sm:space-x-4">
            <nav className="flex items-center space-x-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="h-9 px-3 sm:px-4">
                  Login
                </Button>
              </Link>
              <Link href="/login">
                <Button size="sm" className="h-9 px-3 sm:px-4">Sign Up</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section className="w-full py-8 sm:py-12 md:py-16 lg:py-24 bg-black relative overflow-hidden">
          {/* Decorative background */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary rounded-full blur-3xl"></div>
          </div>
          <div className="container relative z-10 px-4 sm:px-6">
            <div className="flex flex-col items-start gap-3 sm:gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-1 h-9 group">
                  <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                  <span className="hidden sm:inline">Back to Home</span>
                  <span className="sm:hidden">Back</span>
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tighter mb-2 sm:mb-3">
                  Privacy Policy
                </h1>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Last updated: April 10, 2025
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 sm:py-16 md:py-24 bg-gray-950">
          <div className="container px-4 sm:px-6">
            <div className="mx-auto max-w-3xl space-y-6 sm:space-y-8">
              <div className="space-y-3 sm:space-y-4">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">Introduction</h2>
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                  AI Content Generator ("we", "our", or "us") is committed to protecting your privacy. This Privacy
                  Policy explains how we collect, use, disclose, and safeguard your information when you use our website
                  and services.
                </p>
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                  Please read this Privacy Policy carefully. By accessing or using our service, you acknowledge that you
                  have read, understood, and agree to be bound by all the terms of this Privacy Policy.
                </p>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">Information We Collect</h2>
                <p className="text-muted-foreground text-sm sm:text-base">We may collect the following types of information:</p>
                <ul className="list-disc pl-5 sm:pl-6 space-y-2 sm:space-y-3 text-muted-foreground text-sm sm:text-base leading-relaxed">
                  <li>
                    <strong>Personal Information:</strong> Name, email address, billing information, and other contact
                    details you provide when registering for our service.
                  </li>
                  <li>
                    <strong>Content Data:</strong> The content you generate, edit, or store using our service.
                  </li>
                  <li>
                    <strong>Usage Data:</strong> Information about how you use our service, including features accessed,
                    time spent, and actions taken.
                  </li>
                  <li>
                    <strong>Device Information:</strong> Information about your device, including IP address, browser
                    type, and operating system.
                  </li>
                </ul>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">How We Use Your Information</h2>
                <p className="text-muted-foreground text-sm sm:text-base">We may use the information we collect for various purposes:</p>
                <ul className="list-disc pl-5 sm:pl-6 space-y-2 sm:space-y-3 text-muted-foreground text-sm sm:text-base leading-relaxed">
                  <li>To provide, maintain, and improve our services</li>
                  <li>To process your transactions and manage your account</li>
                  <li>To send you service-related notifications and updates</li>
                  <li>To respond to your inquiries and provide customer support</li>
                  <li>To personalize your experience and deliver content relevant to your interests</li>
                  <li>To monitor and analyze usage patterns and trends</li>
                  <li>To protect against unauthorized access and ensure the security of our service</li>
                </ul>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">Sharing Your Information</h2>
                <p className="text-muted-foreground text-sm sm:text-base">We may share your information in the following situations:</p>
                <ul className="list-disc pl-5 sm:pl-6 space-y-2 sm:space-y-3 text-muted-foreground text-sm sm:text-base leading-relaxed">
                  <li>
                    <strong>With Service Providers:</strong> We may share your information with third-party vendors who
                    provide services on our behalf, such as payment processing and data analysis.
                  </li>
                  <li>
                    <strong>For Legal Reasons:</strong> We may disclose your information if required to do so by law or
                    in response to valid requests by public authorities.
                  </li>
                  <li>
                    <strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets,
                    your information may be transferred as a business asset.
                  </li>
                  <li>
                    <strong>With Your Consent:</strong> We may share your information with third parties when you have
                    given us your consent to do so.
                  </li>
                </ul>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">Data Security</h2>
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                  We implement appropriate technical and organizational measures to protect your personal information
                  from unauthorized access, disclosure, alteration, and destruction. However, no method of transmission
                  over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
                </p>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">Your Rights</h2>
                <p className="text-muted-foreground text-sm sm:text-base">Depending on your location, you may have the following rights:</p>
                <ul className="list-disc pl-5 sm:pl-6 space-y-2 sm:space-y-3 text-muted-foreground text-sm sm:text-base leading-relaxed">
                  <li>The right to access the personal information we hold about you</li>
                  <li>The right to request correction of inaccurate personal information</li>
                  <li>The right to request deletion of your personal information</li>
                  <li>The right to object to processing of your personal information</li>
                  <li>The right to data portability</li>
                  <li>The right to withdraw consent at any time</li>
                </ul>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">Changes to This Privacy Policy</h2>
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                  We may update our Privacy Policy from time to time. We will notify you of any changes by posting the
                  new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this
                  Privacy Policy periodically for any changes.
                </p>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">Contact Us</h2>
                <p className="text-muted-foreground text-sm sm:text-base">
                  If you have any questions about this Privacy Policy, please contact us at:
                </p>
                <p className="text-muted-foreground text-sm sm:text-base">
                  <a href="mailto:privacy@aicontentgenerator.com" className="text-primary hover:underline font-medium">
                    privacy@aicontentgenerator.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        </section>
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
