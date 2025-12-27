import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Sparkles } from "lucide-react"

export default function CookiePolicyPage() {
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
                  Cookie Policy
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
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">What Are Cookies</h2>
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                  Cookies are small text files that are placed on your computer or mobile device when you visit a
                  website. They are widely used to make websites work more efficiently and provide information to the
                  owners of the site.
                </p>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">How We Use Cookies</h2>
                <p className="text-muted-foreground text-sm sm:text-base">We use cookies for various purposes, including:</p>
                <ul className="list-disc pl-5 sm:pl-6 space-y-2 sm:space-y-3 text-muted-foreground text-sm sm:text-base leading-relaxed">
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

              <div className="space-y-3 sm:space-y-4">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">Types of Cookies We Use</h2>
                <div className="space-y-3 sm:space-y-4">
                  <div className="rounded-lg border border-gray-800 bg-black/50 p-4 sm:p-6 hover:border-primary/50 transition-colors">
                    <h3 className="font-bold mb-2 text-sm sm:text-base">Session Cookies</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      These cookies are temporary and expire once you close your browser. They are used to keep track of
                      your activities during a single browsing session.
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-800 bg-black/50 p-4 sm:p-6 hover:border-primary/50 transition-colors">
                    <h3 className="font-bold mb-2 text-sm sm:text-base">Persistent Cookies</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      These cookies remain on your device for a specified period and are activated each time you visit
                      the website that created the cookie.
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-800 bg-black/50 p-4 sm:p-6 hover:border-primary/50 transition-colors">
                    <h3 className="font-bold mb-2 text-sm sm:text-base">Third-Party Cookies</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      These cookies are placed by third-party services that appear on our pages, such as analytics
                      services and advertising networks.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">Managing Cookies</h2>
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                  Most web browsers allow you to control cookies through their settings. You can usually find these
                  settings in the "Options" or "Preferences" menu of your browser. You can also use the "Help" option in
                  your browser for more details.
                </p>
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                  Please note that if you choose to block or delete cookies, you may not be able to access certain areas
                  or features of our website, and some services may not function properly.
                </p>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">Changes to Our Cookie Policy</h2>
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                  We may update our Cookie Policy from time to time. We will notify you of any changes by posting the
                  new Cookie Policy on this page and updating the "Last updated" date.
                </p>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">Contact Us</h2>
                <p className="text-muted-foreground text-sm sm:text-base">
                  If you have any questions about our Cookie Policy, please contact us at:
                </p>
                <p className="text-muted-foreground text-sm sm:text-base">
                  <a href="mailto:cookies@aicontentgenerator.com" className="text-primary hover:underline font-medium">
                    cookies@aicontentgenerator.com
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
