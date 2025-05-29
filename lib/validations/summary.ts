import { z } from "zod"

export const summarySchema = z.object({
  text: z.string().min(1, "Text is required"),
  maxLength: z.number().min(50).max(1000).optional().default(200),
  type: z.enum(["extractive", "abstractive"]).optional().default("abstractive"),
  language: z.string().optional().default("en"),
})

export const bulkSummarySchema = z.object({
  texts: z.array(z.string()).min(1, "At least one text is required"),
  maxLength: z.number().min(50).max(1000).optional().default(200),
  type: z.enum(["extractive", "abstractive"]).optional().default("abstractive"),
})
