"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, X, Sparkles } from "lucide-react"

export function BlogMobileMenu() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild className="md:hidden">
        <Button variant="ghost" size="sm" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] bg-white border-gray-200">
        <div className="flex flex-col gap-6 mt-8">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2" onClick={() => setOpen(false)}>
              <Sparkles className="h-6 w-6 text-blue-600" />
              <span className="font-bold text-gray-900">AI Content Generator</span>
            </Link>
            <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <nav className="flex flex-col gap-4">
            <Link
              href="/blog"
              className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
              onClick={() => setOpen(false)}
            >
              Blog
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
              onClick={() => setOpen(false)}
            >
              About
            </Link>
            <Link
              href="/careers"
              className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
              onClick={() => setOpen(false)}
            >
              Careers
            </Link>
          </nav>
          <div className="flex flex-col gap-3 pt-4 border-t border-gray-200">
            <Link href="/login" onClick={() => setOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                Login
              </Button>
            </Link>
            <Link href="/login" onClick={() => setOpen(false)}>
              <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

