"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  FileText,
  BarChart2,
  Settings,
  LogOut,
  Sparkles,
  MessageSquare,
  CreditCard,
  Folder,
  User,
  Users,
  Shield,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
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

export function DashboardSidebar() {
  const pathname = usePathname()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebar-collapsed")
      return saved === "true"
    }
    return false
  })

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setUser(user)

        if (user) {
          // Check if user is admin
          const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("id", user.id).single()

          setIsAdmin(profile?.is_admin || false)
        }
      } catch (error) {
        console.error("Error fetching user:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [supabase])

  const handleToggleCollapse = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebar-collapsed", String(newState))
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      window.location.href = "/"
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

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

  return (
    <div
      className={`flex h-full flex-col border-r bg-background transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="flex h-14 items-center justify-between border-b px-4">
        <Link href="/dashboard" className={`flex items-center gap-2 font-semibold ${isCollapsed ? "justify-center w-full" : ""}`}>
          <Sparkles className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && <span className="truncate">AI Content Generator</span>}
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleCollapse}
          className="hidden lg:flex h-8 w-8 p-0 ml-auto"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid items-start px-2 text-sm font-medium">
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${
              pathname === "/dashboard" ? "bg-secondary text-primary" : "text-muted-foreground"
            } ${isCollapsed ? "justify-center" : ""}`}
            title={isCollapsed ? "Dashboard" : undefined}
          >
            <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && <span>Dashboard</span>}
          </Link>
          <Link
            href="/dashboard/projects"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${
              pathname === "/dashboard/projects" || pathname.startsWith("/dashboard/projects/")
                ? "bg-secondary text-primary"
                : "text-muted-foreground"
            } ${isCollapsed ? "justify-center" : ""}`}
            title={isCollapsed ? "Projects" : undefined}
          >
            <Folder className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && <span>Projects</span>}
          </Link>
          <Link
            href="/dashboard/generate"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${
              pathname === "/dashboard/generate" ? "bg-secondary text-primary" : "text-muted-foreground"
            } ${isCollapsed ? "justify-center" : ""}`}
            title={isCollapsed ? "Generate Content" : undefined}
          >
            <FileText className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && <span>Generate Content</span>}
          </Link>
          <Link
            href="/dashboard/sentiment-analysis"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${
              pathname === "/dashboard/sentiment-analysis" ? "bg-secondary text-primary" : "text-muted-foreground"
            } ${isCollapsed ? "justify-center" : ""}`}
            title={isCollapsed ? "Sentiment Analysis" : undefined}
          >
            <MessageSquare className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && <span>Sentiment Analysis</span>}
          </Link>
          <Link
            href="/dashboard/analytics"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${
              pathname === "/dashboard/analytics" ? "bg-secondary text-primary" : "text-muted-foreground"
            } ${isCollapsed ? "justify-center" : ""}`}
            title={isCollapsed ? "Analytics" : undefined}
          >
            <BarChart2 className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && <span>Analytics</span>}
          </Link>
          <Link
            href="/dashboard/subscription"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${
              pathname === "/dashboard/subscription" ? "bg-secondary text-primary" : "text-muted-foreground"
            } ${isCollapsed ? "justify-center" : ""}`}
            title={isCollapsed ? "Subscription" : undefined}
          >
            <CreditCard className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && <span>Subscription</span>}
          </Link>

          {/* Admin Section */}
          {isAdmin && (
            <>
              <div className="my-2 border-t border-gray-200 dark:border-gray-700"></div>
              {!isCollapsed && (
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Admin
              </div>
              )}
              <Link
                href="/dashboard/admin/applications"
                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${
                  pathname === "/dashboard/admin/applications" ? "bg-secondary text-primary" : "text-muted-foreground"
                } ${isCollapsed ? "justify-center" : ""}`}
                title={isCollapsed ? "Applications" : undefined}
              >
                <Users className="h-4 w-4 flex-shrink-0" />
                {!isCollapsed && <span>Applications</span>}
              </Link>
              <Link
                href="/dashboard/admin/users"
                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${
                  pathname === "/dashboard/admin/users" ? "bg-secondary text-primary" : "text-muted-foreground"
                } ${isCollapsed ? "justify-center" : ""}`}
                title={isCollapsed ? "User Management" : undefined}
              >
                <Shield className="h-4 w-4 flex-shrink-0" />
                {!isCollapsed && <span>User Management</span>}
              </Link>
            </>
          )}

          <div className="my-2 border-t border-gray-200 dark:border-gray-700"></div>
          <Link
            href="/dashboard/settings"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${
              pathname === "/dashboard/settings" ? "bg-secondary text-primary" : "text-muted-foreground"
            } ${isCollapsed ? "justify-center" : ""}`}
            title={isCollapsed ? "Settings" : undefined}
          >
            <Settings className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && <span>Settings</span>}
          </Link>
        </nav>
      </div>
      <div className="mt-auto p-4">
        {loading ? (
          <div className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}>
            <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
            {!isCollapsed && (
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            )}
          </div>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className={`w-full justify-start px-2 ${isCollapsed ? "justify-center" : ""}`}>
                <div className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}>
                  <Avatar className="h-9 w-9 flex-shrink-0">
                    <AvatarImage src={user?.user_metadata?.avatar_url || ""} alt={getUserName()} />
                    <AvatarFallback>{getInitials(getUserName())}</AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex flex-col items-start text-sm min-w-0">
                      <span className="font-medium truncate w-full">{getUserName()}</span>
                      <span className="text-xs text-muted-foreground truncate w-full">
                      {user?.email} {isAdmin && "(Admin)"}
                    </span>
                  </div>
                  )}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings" className="flex items-center gap-2 cursor-pointer">
                  <User className="h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/subscription" className="flex items-center gap-2 cursor-pointer">
                  <CreditCard className="h-4 w-4" />
                  Subscription
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings" className="flex items-center gap-2 cursor-pointer">
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2 cursor-pointer">
                <LogOut className="h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}
