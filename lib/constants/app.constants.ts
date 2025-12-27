/**
 * Application-wide constants
 * Centralized location for magic numbers and strings
 */

// API Configuration
export const API_CONFIG = {
  MAX_CONTENT_LENGTH: 10000,
  MAX_TITLE_LENGTH: 255,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_COMMENT_LENGTH: 2000,
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
  DEFAULT_LIMIT: 20,
} as const

// File Upload Configuration
export const FILE_CONFIG = {
  MAX_AVATAR_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_RESUME_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  ALLOWED_RESUME_TYPES: ["application/pdf", "image/jpeg", "image/png"],
} as const

// Content Types
export const CONTENT_TYPES = {
  PRODUCT_DESCRIPTION: "product-description",
  BLOG_POST: "blog-post",
  ARTICLE: "article",
  SOCIAL_MEDIA: "social-media",
  EMAIL: "email",
  AD_COPY: "ad-copy",
  IMAGE: "image",
} as const

// Subscription Plans
export const SUBSCRIPTION_PLANS = {
  FREE: "free",
  PROFESSIONAL: "professional",
  ENTERPRISE: "enterprise",
} as const

// Status Values
export const STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  FLAGGED: "flagged",
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const

// Application Status
export const APPLICATION_STATUS = {
  PENDING: "pending",
  REVIEWED: "reviewed",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
} as const

// Cache Durations (in seconds)
export const CACHE_DURATION = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
} as const

// Rate Limiting
export const RATE_LIMITS = {
  API_REQUESTS_PER_MINUTE: 60,
  API_REQUESTS_PER_HOUR: 1000,
  CONTENT_GENERATION_PER_DAY: 100,
  IMAGE_GENERATION_PER_DAY: 50,
} as const

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const

// Error Messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: "Unauthorized",
  FORBIDDEN: "Forbidden",
  NOT_FOUND: "Not found",
  VALIDATION_ERROR: "Validation error",
  SERVER_ERROR: "Internal server error",
  RATE_LIMIT_EXCEEDED: "Rate limit exceeded",
} as const

// Success Messages
export const SUCCESS_MESSAGES = {
  CREATED: "Created successfully",
  UPDATED: "Updated successfully",
  DELETED: "Deleted successfully",
  SAVED: "Saved successfully",
} as const

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: "MMM dd, yyyy",
  DISPLAY_WITH_TIME: "MMM dd, yyyy 'at' h:mm a",
  ISO: "yyyy-MM-dd",
  DATETIME: "yyyy-MM-dd HH:mm:ss",
} as const

// Regex Patterns
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  PHONE: /^\+?[\d\s\-\(\)]{10,15}$/,
} as const

// Storage Buckets
export const STORAGE_BUCKETS = {
  AVATARS: "avatars",
  RESUMES: "resumes",
  GENERATED_IMAGES: "generated-images",
} as const

// Content Categories
export const CONTENT_CATEGORIES = {
  GENERAL: "general",
  MARKETING: "marketing",
  TECHNICAL: "technical",
  CREATIVE: "creative",
  BUSINESS: "business",
  IMAGE: "image",
} as const

