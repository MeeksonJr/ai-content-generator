import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Sparkles } from "lucide-react"

export default function TermsOfServicePage() {
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
              <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">Terms of Service</h1>
              <p className="text-muted-foreground">Last updated: April 10, 2025</p>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 bg-gray-950">
          <div className="container px-4 md:px-6">
            <div className="mx-auto max-w-3xl space-y-8">
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">1. Acceptance of Terms</h2>
                <p className="text-muted-foreground">
                  By accessing or using the AI Content Generator service, you agree to be bound by these Terms of
                  Service. If you do not agree to these terms, please do not use our service.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-bold">2. Description of Service</h2>
                <p className="text-muted-foreground">
                  AI Content Generator provides an AI-powered content generation platform that allows users to create
                  various types of content, including but not limited to product descriptions, blog posts, social media
                  content, and marketing copy.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-bold">3. User Accounts</h2>
                <p className="text-muted-foreground">
                  To access certain features of the service, you must register for an account. You are responsible for
                  maintaining the confidentiality of your account information and for all activities that occur under
                  your account.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-bold">4. Subscription and Billing</h2>
                <p className="text-muted-foreground">
                  Some features of our service require a paid subscription. By subscribing to a paid plan, you agree to
                  pay the subscription fees as described at the time of purchase. Subscription fees are billed in
                  advance and are non-refundable.
                </p>
                <p className="text-muted-foreground">
                  We reserve the right to change our subscription fees at any time. Any changes to subscription fees
                  will be communicated to you in advance and will take effect at the next billing cycle.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-bold">5. User Content</h2>
                <p className="text-muted-foreground">
                  You retain ownership of any content you generate using our service. However, you grant us a
                  non-exclusive, worldwide, royalty-free license to use, reproduce, and display your content solely for
                  the purpose of providing and improving our service.
                </p>
                <p className="text-muted-foreground">
                  You are solely responsible for the content you generate using our service and must ensure that it does
                  not violate any applicable laws or infringe on the rights of third parties.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-bold">6. Prohibited Uses</h2>
                <p className="text-muted-foreground">You agree not to use our service to:</p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Generate content that is illegal, harmful, threatening, abusive, or otherwise objectionable</li>
                  <li>Infringe on the intellectual property rights of others</li>
                  <li>Generate spam, phishing content, or other deceptive materials</li>
                  <li>Attempt to gain unauthorized access to our systems or other users' accounts</li>
                  <li>Interfere with or disrupt the integrity or performance of the service</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-bold">7. Limitation of Liability</h2>
                <p className="text-muted-foreground">
                  To the maximum extent permitted by law, AI Content Generator shall not be liable for any indirect,
                  incidental, special, consequential, or punitive damages, including loss of profits, data, or business
                  opportunities, arising out of or in connection with your use of the service.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-bold">8. Termination</h2>
                <p className="text-muted-foreground">
                  We reserve the right to suspend or terminate your access to our service at any time for any reason,
                  including but not limited to a violation of these Terms of Service.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-bold">9. Changes to Terms</h2>
                <p className="text-muted-foreground">
                  We may modify these Terms of Service at any time. We will notify you of any changes by posting the new
                  Terms of Service on our website and updating the "Last updated" date. Your continued use of the
                  service after such changes constitutes your acceptance of the new Terms of Service.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-bold">10. Governing Law</h2>
                <p className="text-muted-foreground">
                  These Terms of Service shall be governed by and construed in accordance with the laws of the United
                  States, without regard to its conflict of law provisions.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-bold">11. Contact Us</h2>
                <p className="text-muted-foreground">
                  If you have any questions about these Terms of Service, please contact us at:
                </p>
                <p className="text-muted-foreground">terms@aicontentgenerator.com</p>
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
