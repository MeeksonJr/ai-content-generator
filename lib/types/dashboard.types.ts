import type { Database } from "@/lib/database.types"

// Project types
export type ProjectRow = Database["public"]["Tables"]["projects"]["Row"]
export type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"]
export type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"]

// Content types
export type ContentRow = Database["public"]["Tables"]["content"]["Row"]
export type ContentInsert = Database["public"]["Tables"]["content"]["Insert"]
export type ContentUpdate = Database["public"]["Tables"]["content"]["Update"]

// Subscription types
export type SubscriptionRow = Database["public"]["Tables"]["subscriptions"]["Row"]
export type SubscriptionInsert = Database["public"]["Tables"]["subscriptions"]["Insert"]
export type SubscriptionUpdate = Database["public"]["Tables"]["subscriptions"]["Update"]

// Usage types
export type UsageLimitRow = Database["public"]["Tables"]["usage_limits"]["Row"]
export type UsageStatsRow = Database["public"]["Tables"]["usage_stats"]["Row"]

// Extended types for UI
export interface ProjectWithCount extends ProjectRow {
  content_count?: number
}

export interface ContentWithProject extends ContentRow {
  project?: ProjectRow | null
}

export interface DashboardStats {
  subscription: SubscriptionRow | null
  usageLimits: UsageLimitRow | null
  usageStats: UsageStatsRow | null
  recentContent: ContentRow[]
  recentProjects: ProjectRow[]
}

