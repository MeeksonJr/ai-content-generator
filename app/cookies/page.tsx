import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Sparkles } from "lucide-react"

export default function CookiePolicyPage() {
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
              <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">Cookie Policy</h1>
              <p className="text-muted-foreground">Last updated: April 10, 2025</p>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 bg-gray-950">
          <div className="container px-4 md:px-6">
            <div className="mx-auto max-w-3xl space-y-8">
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">What Are Cookies</h2>
                <p className="text-muted-foreground">
                  Cookies are small text files that are placed on your computer or mobile device when you visit a
                  website. They are widely used to make websites work more efficiently and provide information to the
                  owners of the site.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-bold">How We Use Cookies</h2>
                <p className="text-muted-foreground">We use cookies for various purposes, including:</p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>
                    <strong>Essential Cookies:</strong> These cookies are necessary for the website to function properly
                    and cannot be switched off in our systems. They are usually only set in response to actions made by
                    you which amount to a request for services, such as setting your privacy preferences, logging in, or
                    filling in forms.
                  </li>
                  <li>
                    <strong>Performance Cookies:</strong> These cookies allow us to count visits and traffic sources so
                    we can measure and improve the performance of our site. They help us to know which pages are the
                    most and least popular and see how visitors move around the site.
                  </li>
                  <li>
                    <strong>Functional Cookies:</strong> These cookies enable the website to provide enhanced
                    functionality and personalization. They may be set by us or by third-party providers whose services
                    we have added to our pages.
                  </li>
                  <li>
                    <strong>Targeting Cookies:</strong> These cookies may be set through our site by our advertising
                    partners. They may be used by those companies to build a profile of your interests and show you
                    relevant advertisements on other sites.
                  </li>
                </ul>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Types of Cookies We Use</h2>
                <div className="space-y-4">
                  <div className="rounded-lg border border-gray-800 bg-black/50 p-4">
                    <h3 className="font-bold mb-2">Session Cookies</h3>
                    <p className="text-sm text-muted-foreground">
                      These cookies are temporary and expire once you close your browser. They are used to keep track of
                      your activities during a single browsing session.
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-800 bg-black/50 p-4">
                    <h3 className="font-bold mb-2">Persistent Cookies</h3>
                    <p className="text-sm text-muted-foreground">
                      These cookies remain on your device for a specified period and are activated each time you visit
                      the website that created the cookie.
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-800 bg-black/50 p-4">
                    <h3 className="font-bold mb-2">Third-Party Cookies</h3>
                    <p className="text-sm text-muted-foreground">
                      These cookies are placed by third-party services that appear on our pages, such as analytics
                      services and advertising networks.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Managing Cookies</h2>
                <p className="text-muted-foreground">
                  Most web browsers allow you to control cookies through their settings. You can usually find these
                  settings in the "Options" or "Preferences" menu of your browser. You can also use the "Help" option in
                  your browser for more details.
                </p>
                <p className="text-muted-foreground">
                  Please note that if you choose to block or delete cookies, you may not be able to access certain areas
                  or features of our website, and some services may not function properly.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Changes to Our Cookie Policy</h2>
                <p className="text-muted-foreground">
                  We may update our Cookie Policy from time to time. We will notify you of any changes by posting the
                  new Cookie Policy on this page and updating the "Last updated" date.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Contact Us</h2>
                <p className="text-muted-foreground">
                  If you have any questions about our Cookie Policy, please contact us at:
                </p>
                <p className="text-muted-foreground">cookies@aicontentgenerator.com</p>
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
