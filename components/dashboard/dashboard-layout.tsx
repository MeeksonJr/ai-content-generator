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
  User,
  Users,
  Shield,
  Receipt,
  RefreshCw,
  Sparkles,
} from "lucide-react"
import { NotificationsBell } from "@/components/notifications/notifications-bell"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"

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
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  // Fetch user and admin status
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setUser(user)

        if (user) {
          // Check if user is admin
          try {
            const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("id", user.id).maybeSingle()
            const profileData = profile as { is_admin?: boolean } | null
            setIsAdmin(profileData?.is_admin || false)
          } catch (error) {
            // If user_profiles table doesn't exist or user has no profile, default to false
            setIsAdmin(false)
          }
        }
      } catch (error) {
        console.error("Error fetching user:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [supabase])

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

  const getInitials = (name: string) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const getUserName = () => {
    if (!user) return "User"
    return user.user_metadata?.name || user.email?.split("@")[0] || "User"
  }

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Content Generator", href: "/dashboard/generate", icon: FileText },
    { name: "Templates", href: "/dashboard/templates", icon: FileText },
    { name: "Projects", href: "/dashboard/projects", icon: FolderKanban },
    { name: "Sentiment Analysis", href: "/dashboard/sentiment-analysis", icon: MessageSquare },
    { name: "Text Summarization", href: "/dashboard/summarize", icon: FileDigit },
    { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
    { name: "API Documentation", href: "/dashboard/api-docs", icon: Code },
    { name: "Subscription", href: "/dashboard/subscription", icon: CreditCard },
    { name: "Payment History", href: "/dashboard/payment-history", icon: Receipt },
    { name: "Refunds", href: "/dashboard/refunds", icon: RefreshCw },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-black text-white">
      {/* Sidebar for mobile */}
      <div
        className={`fixed inset-0 z-40 lg:hidden transition-opacity duration-300 ${
          isSidebarOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={() => setIsSidebarOpen(false)}
      >
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm" />
      </div>

      <div
        className={`fixed inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out transform bg-gradient-to-b from-gray-950 to-black border-r border-gray-800 shadow-xl lg:translate-x-0 lg:static lg:inset-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${isCollapsed ? "lg:w-16" : "w-64 lg:w-64"}`}
      >
        <div className="flex items-center justify-between h-14 sm:h-16 px-4 sm:px-6 border-b border-gray-800 bg-gray-950/50">
          <Link 
            href="/dashboard" 
            className={`text-lg sm:text-xl font-bold text-white transition-all ${
              isCollapsed ? "hidden lg:block lg:w-full lg:text-center" : ""
            }`}
          >
            {isCollapsed ? (
              <span className="text-primary">AI</span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="hidden sm:inline">AI Content Gen</span>
                <span className="sm:hidden">AI Gen</span>
              </span>
            )}
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleCollapse}
              className="hidden lg:flex h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          <button
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-all lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close sidebar"
            title="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
          </div>
        </div>
        <nav className="flex flex-col h-[calc(100%-3.5rem)] sm:h-[calc(100%-4rem)] overflow-y-auto p-3 sm:p-4">
          <div className="space-y-1 flex-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-3 sm:px-4 py-2 sm:py-2.5 text-sm rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-primary/20 to-indigo-500/20 text-white border border-primary/30 shadow-lg shadow-primary/10"
                      : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
                  } ${isCollapsed ? "lg:justify-center lg:px-2" : ""}`}
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon 
                    className={`flex-shrink-0 transition-colors ${
                      isCollapsed ? "lg:mr-0 w-5 h-5" : "mr-3 w-4 h-4 sm:w-5 sm:h-5"
                    } ${isActive ? "text-primary" : "text-gray-400 group-hover:text-primary"}`} 
                  />
                  {!isCollapsed && (
                    <span className="font-medium text-xs sm:text-sm truncate flex-1">
                      {item.name}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
          {/* Admin Section */}
          {isAdmin && (
            <>
              <div className="pt-4 mt-auto border-t border-gray-800 space-y-1">
                {!isCollapsed && (
                  <div className="px-3 sm:px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Admin
                  </div>
                )}
                {[
                  { href: "/dashboard/admin/applications", name: "Applications", icon: Users },
                  { href: "/dashboard/admin/users", name: "User Management", icon: Shield },
                  { href: "/dashboard/admin/settings", name: "System Settings", icon: Settings },
                  { href: "/dashboard/admin/content-moderation", name: "Content Moderation", icon: Shield },
                ].map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group flex items-center px-3 sm:px-4 py-2 sm:py-2.5 text-sm rounded-lg transition-all duration-200 ${
                        isActive
                          ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-white border border-amber-500/30 shadow-lg shadow-amber-500/10"
                          : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
                      } ${isCollapsed ? "lg:justify-center lg:px-2" : ""}`}
                      title={isCollapsed ? item.name : undefined}
                    >
                      <item.icon 
                        className={`flex-shrink-0 transition-colors ${
                          isCollapsed ? "lg:mr-0 w-5 h-5" : "mr-3 w-4 h-4 sm:w-5 sm:h-5"
                        } ${isActive ? "text-amber-400" : "text-gray-400 group-hover:text-amber-400"}`} 
                      />
                      {!isCollapsed && (
                        <span className="font-medium text-xs sm:text-sm truncate flex-1">
                          {item.name}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </>
          )}

          <div className="pt-3 sm:pt-4 mt-auto border-t border-gray-800">
            {loading ? (
              <div className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 ${isCollapsed ? "justify-center" : ""}`}>
                <Skeleton className="h-8 w-8 sm:h-9 sm:w-9 rounded-full flex-shrink-0 bg-gray-800" />
                {!isCollapsed && (
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <Skeleton className="h-3.5 sm:h-4 w-24 sm:w-32 bg-gray-800" />
                    <Skeleton className="h-3 w-16 sm:w-24 bg-gray-800" />
                  </div>
                )}
              </div>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start px-2 sm:px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all rounded-lg ${
                      isCollapsed ? "justify-center" : ""
                    }`}
                  >
                    <div className={`flex items-center gap-2 sm:gap-3 ${isCollapsed ? "justify-center" : ""} w-full`}>
                      <Avatar className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 border-2 border-gray-700 hover:border-primary/50 transition-colors">
                        <AvatarImage src={user?.user_metadata?.avatar_url || ""} alt={getUserName()} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-indigo-500/20 text-white border-2 border-primary/30">
                          {getInitials(getUserName())}
                        </AvatarFallback>
                      </Avatar>
                      {!isCollapsed && (
                        <div className="flex flex-col items-start text-xs sm:text-sm min-w-0 flex-1">
                          <span className="font-semibold truncate w-full text-white">{getUserName()}</span>
                          <span className="text-xs text-gray-500 truncate w-full">
                            {user?.email?.split("@")[0]} {isAdmin && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                Admin
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-gray-900 border-gray-800">
                  <DropdownMenuLabel className="text-white">My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-800" />
                  <DropdownMenuItem asChild className="hover:bg-gray-800">
                    <Link href="/dashboard/settings" className="flex items-center gap-2 cursor-pointer w-full">
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="hover:bg-gray-800">
                    <Link href="/dashboard/subscription" className="flex items-center gap-2 cursor-pointer w-full">
                      <CreditCard className="h-4 w-4" />
                      Subscription
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="hover:bg-gray-800">
                    <Link href="/dashboard/settings" className="flex items-center gap-2 cursor-pointer w-full">
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-800" />
                  <DropdownMenuItem 
                    onClick={handleSignOut} 
                    className="flex items-center gap-2 cursor-pointer hover:bg-red-500/20 hover:text-red-400"
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </nav>
      </div>

      <div className="flex flex-col flex-1 w-0 overflow-hidden">
        {/* Mobile Header */}
        <div className="flex items-center justify-between h-14 sm:h-16 px-4 sm:px-6 border-b border-gray-800 bg-gray-950/50 backdrop-blur-sm lg:hidden sticky top-0 z-30">
          <button
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-all"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open sidebar"
            title="Open sidebar"
          >
            <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-base sm:text-lg font-semibold text-white">AI Content Gen</span>
          </div>
          <NotificationsBell />
        </div>
        {/* Desktop Header */}
        <div className="hidden lg:flex items-center justify-between h-14 sm:h-16 px-6 border-b border-gray-800 bg-gray-950/50 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <NotificationsBell />
          </div>
        </div>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gradient-to-b from-gray-950 to-black">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
