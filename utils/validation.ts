import { z } from "zod"

export const getKeywordsSchema = z.object({
  text: z.string().min(1, "Text is required"),
  maxKeywords: z.number().min(1).max(50).optional().default(10),
})

export const contentGenerationSchema = z.object({
  title: z.string().min(1, "Title is required"),
  prompt: z.string().min(1, "Prompt is required"),
  contentType: z.enum(["blog-post", "product-description", "social-media", "email", "ad-copy"]),
  maxLength: z.number().min(100).max(5000).optional().default(1000),
})

export const sentimentAnalysisSchema = z.object({
  text: z.string().min(1, "Text is required"),
  detailed: z.boolean().optional().default(false),
})
