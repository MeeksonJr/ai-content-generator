import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminUsersClient, AdminUserRecord } from "@/components/admin/admin-users-client"

type SubscriptionTableRow = {
  id: string
  user_id: string
  plan_type: string | null
  status: string | null
  started_at: string | null
  expires_at: string | null
  updated_at: string | null
}

type UsageTableRow = {
  user_id: string
  content_generated: number
  sentiment_analysis_used: number
  keyword_extraction_used: number
  text_summarization_used: number
}

export default async function AdminUsersPage() {
  const supabase = await createClient()

  // Try to get user first (more reliable than getSession in server components)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile?.is_admin) {
    redirect("/dashboard")
  }

  // Use server client to access auth.users for email addresses
  const { createServerSupabaseClient } = await import("@/lib/supabase/server-client")
  const serverSupabase = createServerSupabaseClient()

  const [{ data: profiles }, { data: subscriptions }, { data: usageStats }] = await Promise.all([
    supabase.from("user_profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("subscriptions").select("*"),
    supabase.from("usage_stats").select("*"),
  ])

  // Fetch user emails from auth.users (requires service role)
  const userIds = profiles?.map((p) => p.id) || []
  const userEmailsMap = new Map<string, { email: string; emailVerified: boolean; metadata: any }>()
  
  // Fetch user data from auth.users in batches
  for (const userId of userIds) {
    try {
      // @ts-ignore - auth.users is accessible via admin API
      const { data: authUser, error } = await serverSupabase.auth.admin.getUserById(userId)
      if (!error && authUser?.user) {
        userEmailsMap.set(userId, {
          email: authUser.user.email || "",
          emailVerified: authUser.user.email_confirmed_at !== null,
          metadata: authUser.user.user_metadata || {},
        })
      }
    } catch (error) {
      // Silently continue if we can't fetch user data
      console.error(`Failed to fetch user data for ${userId}:`, error)
    }
  }

  const subscriptionMap = new Map<string, SubscriptionTableRow>()
  ;((subscriptions as SubscriptionTableRow[] | null) || []).forEach((sub) => {
    const existing = subscriptionMap.get(sub.user_id)
    if (!existing) {
      subscriptionMap.set(sub.user_id, sub)
    } else {
      const existingDate = existing.updated_at || existing.started_at || ""
      const currentDate = sub.updated_at || sub.started_at || ""
      if (currentDate > existingDate) {
        subscriptionMap.set(sub.user_id, sub)
      }
    }
  })

  const usageMap = new Map<string, AdminUserRecord["usage"]>()
  ;((usageStats as UsageTableRow[] | null) || []).forEach((usage) => {
    const prev = usageMap.get(usage.user_id) || {
      totalContent: 0,
      totalSentiment: 0,
      totalKeywords: 0,
      totalSummaries: 0,
    }
    usageMap.set(usage.user_id, {
      totalContent: prev.totalContent + (usage.content_generated || 0),
      totalSentiment: prev.totalSentiment + (usage.sentiment_analysis_used || 0),
      totalKeywords: prev.totalKeywords + (usage.keyword_extraction_used || 0),
      totalSummaries: prev.totalSummaries + (usage.text_summarization_used || 0),
    })
  })

  const users: AdminUserRecord[] =
    profiles?.map((profile) => {
      const userEmailData = userEmailsMap.get(profile.id)
      return {
        id: profile.id,
        email: userEmailData?.email || "",
        emailVerified: userEmailData?.emailVerified || false,
        displayName: profile.display_name || userEmailData?.metadata?.name || "",
        avatarUrl: profile.avatar_url || userEmailData?.metadata?.avatar_url || null,
        bio: profile.bio || null,
        location: profile.location || null,
        company: userEmailData?.metadata?.company || null,
        website: profile.website_url || userEmailData?.metadata?.website || null,
        isAdmin: profile.is_admin,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
        subscription: subscriptionMap.get(profile.id),
        usage:
          usageMap.get(profile.id) || {
            totalContent: 0,
            totalSentiment: 0,
            totalKeywords: 0,
            totalSummaries: 0,
          },
      }
    }) || []

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground">Manage users, subscription plans, and permissions</p>
        </div>
        <AdminUsersClient initialUsers={users} />
      </div>
    </DashboardLayout>
  )
}

