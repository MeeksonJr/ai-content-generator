"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { List } from "lucide-react"

interface TocItem {
  id: string
  text: string
  level: number
}

interface TableOfContentsProps {
  content: string
}

export function TableOfContents({ content }: TableOfContentsProps) {
  const [tocItems, setTocItems] = useState<TocItem[]>([])
  const [activeId, setActiveId] = useState<string>("")

  useEffect(() => {
    const lines = content.split("\n")
    const items: TocItem[] = []

    lines.forEach((line, index) => {
      if (line.startsWith("## ")) {
        const text = line.substring(3).trim()
        const id = `heading-${index}-${text.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`
        items.push({ id, text, level: 2 })
      } else if (line.startsWith("### ")) {
        const text = line.substring(4).trim()
        const id = `heading-${index}-${text.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`
        items.push({ id, text, level: 3 })
      }
    })

    setTocItems(items)

    // Add IDs to headings in the content
    const headings = document.querySelectorAll("h2, h3")
    headings.forEach((heading, idx) => {
      if (items[idx]) {
        heading.id = items[idx].id
      }
    })
  }, [content])

  useEffect(() => {
    const handleScroll = () => {
      const headings = tocItems.map((item) => {
        const element = document.getElementById(item.id)
        if (element) {
          return {
            id: item.id,
            offsetTop: element.offsetTop,
          }
        }
        return null
      }).filter(Boolean) as { id: string; offsetTop: number }[]

      const scrollPosition = window.scrollY + 100

      for (let i = headings.length - 1; i >= 0; i--) {
        if (scrollPosition >= headings[i].offsetTop) {
          setActiveId(headings[i].id)
          break
        }
      }
    }

    if (tocItems.length > 0) {
      window.addEventListener("scroll", handleScroll)
      handleScroll()
      return () => window.removeEventListener("scroll", handleScroll)
    }
  }, [tocItems])

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      const offset = 80
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - offset

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      })
    }
  }

  if (tocItems.length === 0) {
    return null
  }

  return (
    <Card className="sticky top-24 border-gray-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-900">
          <List className="h-4 w-4" />
          Table of Contents
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <nav className="space-y-1">
          {tocItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToHeading(item.id)}
              className={`block w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors ${
                activeId === item.id
                  ? "bg-blue-50 text-blue-600 font-medium"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              } ${item.level === 3 ? "pl-6" : ""}`}
            >
              {item.text}
            </button>
          ))}
        </nav>
      </CardContent>
    </Card>
  )
}

