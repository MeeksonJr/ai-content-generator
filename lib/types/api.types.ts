/**
 * API-specific type definitions
 * Types for API routes, export functions, and API responses
 */

import type { Database } from "@/lib/database.types"
import type { UsageStatsRow, UsageLimitRow } from "@/lib/types/dashboard.types"

// Content types
export type ContentRow = Database["public"]["Tables"]["content"]["Row"]

// Export data types
export interface ExportDataSummary {
  totalContent: number
  totalUsage: number
  apiCalls: number
  sentimentAnalysis: number
  keywordExtraction: number
  textSummarization: number
}

export interface ExportContentItem {
  id: string
  title: string
  content_type: string
  created_at: string
  sentiment: string | null
  keywords: string[] | null
}

export interface ExportData {
  summary?: ExportDataSummary
  content?: ExportContentItem[]
  usage?: {
    current: UsageStatsRow | Record<string, unknown>
    limits: UsageLimitRow | Record<string, unknown>
  }
}

// Content user ID selection type
export type ContentUserId = Pick<ContentRow, "user_id">

