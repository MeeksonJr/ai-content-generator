import type { Database } from "@/lib/database.types"

export type UsageLimitsRow = Database["public"]["Tables"]["usage_limits"]["Row"]

export const DEFAULT_USAGE_LIMITS: Record<string, UsageLimitsRow> = {
  free: {
    id: "default-free",
    plan_type: "free",
    monthly_content_limit: 5,
    max_content_length: 1000,
    sentiment_analysis_enabled: false,
    keyword_extraction_enabled: false,
    text_summarization_enabled: false,
    api_access_enabled: false,
  },
  basic: {
    id: "default-basic",
    plan_type: "basic",
    monthly_content_limit: 20,
    max_content_length: 3000,
    sentiment_analysis_enabled: true,
    keyword_extraction_enabled: true,
    text_summarization_enabled: false,
    api_access_enabled: false,
  },
  professional: {
    id: "default-professional",
    plan_type: "professional",
    monthly_content_limit: 100,
    max_content_length: 10000,
    sentiment_analysis_enabled: true,
    keyword_extraction_enabled: true,
    text_summarization_enabled: true,
    api_access_enabled: true,
  },
  enterprise: {
    id: "default-enterprise",
    plan_type: "enterprise",
    monthly_content_limit: -1,
    max_content_length: 50000,
    sentiment_analysis_enabled: true,
    keyword_extraction_enabled: true,
    text_summarization_enabled: true,
    api_access_enabled: true,
  },
}

export const getDefaultUsageLimits = (planType: string) => DEFAULT_USAGE_LIMITS[planType] || DEFAULT_USAGE_LIMITS.free

