/**
 * Input validation and sanitization utilities
 * Provides security-focused validation functions
 */

export interface ValidationResult {
  isValid: boolean
  error?: string
  sanitized?: string
}

/**
 * Validates and sanitizes email addresses
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || typeof email !== "string") {
    return { isValid: false, error: "Email is required" }
  }

  const trimmed = email.trim().toLowerCase()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: "Invalid email format" }
  }

  // Basic length check
  if (trimmed.length > 255) {
    return { isValid: false, error: "Email is too long" }
  }

  return { isValid: true, sanitized: trimmed }
}

/**
 * Validates and sanitizes text input
 */
export function validateText(
  text: string,
  options: {
    minLength?: number
    maxLength?: number
    required?: boolean
    allowEmpty?: boolean
  } = {}
): ValidationResult {
  const { minLength = 0, maxLength = 10000, required = false, allowEmpty = false } = options

  if (!text && required) {
    return { isValid: false, error: "This field is required" }
  }

  if (!text && !allowEmpty) {
    return { isValid: false, error: "This field cannot be empty" }
  }

  if (!text) {
    return { isValid: true, sanitized: "" }
  }

  if (typeof text !== "string") {
    return { isValid: false, error: "Invalid input type" }
  }

  const trimmed = text.trim()

  if (trimmed.length < minLength) {
    return { isValid: false, error: `Must be at least ${minLength} characters` }
  }

  if (trimmed.length > maxLength) {
    return { isValid: false, error: `Must be no more than ${maxLength} characters` }
  }

  // Basic XSS prevention - remove script tags and dangerous patterns
  const sanitized = trimmed
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")

  return { isValid: true, sanitized }
}

/**
 * Validates URL format
 */
export function validateUrl(url: string, required = false): ValidationResult {
  if (!url && !required) {
    return { isValid: true, sanitized: "" }
  }

  if (!url && required) {
    return { isValid: false, error: "URL is required" }
  }

  if (typeof url !== "string") {
    return { isValid: false, error: "Invalid URL format" }
  }

  const trimmed = url.trim()

  try {
    const urlObj = new URL(trimmed)
    // Only allow http and https protocols
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      return { isValid: false, error: "URL must use http or https protocol" }
    }
    return { isValid: true, sanitized: trimmed }
  } catch {
    return { isValid: false, error: "Invalid URL format" }
  }
}

/**
 * Validates UUID format
 */
export function validateUuid(uuid: string): ValidationResult {
  if (!uuid || typeof uuid !== "string") {
    return { isValid: false, error: "UUID is required" }
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  if (!uuidRegex.test(uuid)) {
    return { isValid: false, error: "Invalid UUID format" }
  }

  return { isValid: true, sanitized: uuid }
}

/**
 * Validates phone number (basic validation)
 */
export function validatePhone(phone: string, required = false): ValidationResult {
  if (!phone && !required) {
    return { isValid: true, sanitized: "" }
  }

  if (!phone && required) {
    return { isValid: false, error: "Phone number is required" }
  }

  if (typeof phone !== "string") {
    return { isValid: false, error: "Invalid phone format" }
  }

  // Remove common formatting characters
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, "")

  // Basic validation - 10-15 digits
  if (!/^\d{10,15}$/.test(cleaned)) {
    return { isValid: false, error: "Invalid phone number format" }
  }

  return { isValid: true, sanitized: cleaned }
}

/**
 * Validates numeric input
 */
export function validateNumber(
  value: string | number,
  options: {
    min?: number
    max?: number
    integer?: boolean
    required?: boolean
  } = {}
): ValidationResult {
  const { min, max, integer = false, required = false } = options

  if ((value === null || value === undefined || value === "") && !required) {
    return { isValid: true, sanitized: undefined }
  }

  if ((value === null || value === undefined || value === "") && required) {
    return { isValid: false, error: "Number is required" }
  }

  const num = typeof value === "string" ? parseFloat(value) : value

  if (isNaN(num)) {
    return { isValid: false, error: "Invalid number" }
  }

  if (integer && !Number.isInteger(num)) {
    return { isValid: false, error: "Must be an integer" }
  }

  if (min !== undefined && num < min) {
    return { isValid: false, error: `Must be at least ${min}` }
  }

  if (max !== undefined && num > max) {
    return { isValid: false, error: `Must be no more than ${max}` }
  }

  return { isValid: true, sanitized: (integer ? Math.floor(num) : num).toString() }
}

/**
 * Sanitizes HTML content (basic - for more complex needs, use a library like DOMPurify)
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== "string") {
    return ""
  }

  // Remove script tags and event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/javascript:/gi, "")
}

/**
 * Validates search query
 */
export function validateSearchQuery(query: string): ValidationResult {
  if (!query || typeof query !== "string") {
    return { isValid: false, error: "Search query is required" }
  }

  const trimmed = query.trim()

  if (trimmed.length < 1) {
    return { isValid: false, error: "Search query cannot be empty" }
  }

  if (trimmed.length > 500) {
    return { isValid: false, error: "Search query is too long" }
  }

  // Basic XSS prevention
  const sanitized = trimmed.replace(/<[^>]*>/g, "")

  return { isValid: true, sanitized }
}

