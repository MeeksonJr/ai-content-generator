"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  FileText,
  FolderKanban,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  MessageSquare,
  FileDigit,
  CreditCard,
  Code,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebar-collapsed")
      return saved === "true"
    }
    return false
  })
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  // Close sidebar when route changes on mobile
  useEffect(() => {
    setIsSidebarOpen(false)
  }, [pathname])

  const handleToggleCollapse = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebar-collapsed", String(newState))
    }
  }

  // Set dark mode on dashboard
  useEffect(() => {
    document.documentElement.classList.add("dark")
    return () => {
      document.documentElement.classList.remove("dark")
    }
  }, [])

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Content Generator", href: "/dashboard/generate", icon: FileText },
    { name: "Projects", href: "/dashboard/projects", icon: FolderKanban },
    { name: "Sentiment Analysis", href: "/dashboard/sentiment-analysis", icon: MessageSquare },
    { name: "Text Summarization", href: "/dashboard/summarize", icon: FileDigit },
    { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
    { name: "API Documentation", href: "/dashboard/api-docs", icon: Code },
    { name: "Subscription", href: "/dashboard/subscription", icon: CreditCard },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-black text-white">
      {/* Sidebar for mobile */}
      <div
        className={`fixed inset-0 z-40 lg:hidden ${isSidebarOpen ? "block" : "hidden"}`}
        onClick={() => setIsSidebarOpen(false)}
      >
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75" />
      </div>

      <div
        className={`fixed inset-y-0 left-0 z-40 transition-all duration-300 transform bg-gray-950 border-r border-gray-800 lg:translate-x-0 lg:static lg:inset-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${isCollapsed ? "lg:w-16" : "w-64 lg:w-64"}`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-800">
          <Link href="/dashboard" className={`text-xl font-bold text-white ${isCollapsed ? "hidden lg:block lg:w-full lg:text-center" : ""}`}>
            {isCollapsed ? "AI" : "AI Content Gen"}
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleCollapse}
              className="hidden lg:flex h-8 w-8 p-0 text-gray-400 hover:text-white"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          <button className="p-1 text-gray-400 lg:hidden" onClick={() => setIsSidebarOpen(false)}>
            <X className="w-6 h-6" />
          </button>
          </div>
        </div>
        <nav className="flex flex-col h-[calc(100%-4rem)] p-4">
          <div className="space-y-1 flex-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-4 py-2 text-sm rounded-md transition-all ${
                  pathname === item.href || pathname.startsWith(item.href + "/")
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                } ${isCollapsed ? "lg:justify-center" : ""}`}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${isCollapsed ? "lg:mr-0" : "mr-3"}`} />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            ))}
          </div>
          <div className="pt-4 mt-auto border-t border-gray-800">
            <Button
              variant="ghost"
              className={`w-full text-gray-400 hover:text-white hover:bg-gray-800 ${isCollapsed ? "lg:justify-center" : "justify-start"}`}
              onClick={handleSignOut}
              title={isCollapsed ? "Sign out" : undefined}
            >
              <LogOut className={`w-5 h-5 flex-shrink-0 ${isCollapsed ? "lg:mr-0" : "mr-3"}`} />
              {!isCollapsed && <span>Sign out</span>}
            </Button>
          </div>
        </nav>
      </div>

      <div className="flex flex-col flex-1 w-0 overflow-hidden">
        <div className="flex items-center h-16 px-6 border-b border-gray-800 lg:hidden">
          <button className="p-1 text-gray-400" onClick={() => setIsSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
          <div className="ml-4 text-lg font-medium text-white">AI Content Generator</div>
        </div>
        <main className="flex-1 overflow-y-auto p-6 bg-gray-950">{children}</main>
      </div>
    </div>
  )
}
