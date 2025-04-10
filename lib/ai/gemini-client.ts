import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai"
import { logger } from "@/lib/utils/logger"

// Initialize the Gemini API client
const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_GEMINI_API_KEY || ""
const genAI = new GoogleGenerativeAI(apiKey)

// Safety settings to avoid harmful content
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
]

// Content generation prompts for different content types
const CONTENT_PROMPTS = {
  "product-description": `Create a compelling, SEO-optimized product description for the following product. 
  Make it engaging, highlight key features and benefits, and include a call to action.
  Product: {title}
  Details: {prompt}`,

  "blog-post": `Write an informative and engaging blog post about the following topic. 
  Include an introduction, several key points with subheadings, and a conclusion. 
  Make it SEO-friendly and conversational in tone.
  Topic: {title}
  Details: {prompt}`,

  "social-media": `Create an engaging social media post about the following topic. 
  Keep it concise, include relevant hashtags, and make it attention-grabbing.
  Topic: {title}
  Details: {prompt}`,

  email: `Write a professional email for the following purpose. 
  Include a clear subject line, greeting, body, and sign-off.
  Purpose: {title}
  Details: {prompt}`,

  "ad-copy": `Create compelling ad copy for the following product or service.
  Make it concise, persuasive, and include a clear call to action.
  Product/Service: {title}
  Details: {prompt}`,
}

// Fallback content generation for when the API is unavailable
function generateFallbackContent(contentType: string, title: string, prompt: string): string {
  const contentTypeLabel = contentType
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")

  return `# ${title}

## ${contentTypeLabel} (AI-Generated)

${prompt}

---

*Note: This is a basic template. Our AI service is currently experiencing high demand. Please try again later for a fully AI-generated ${contentType.replace("-", " ")}.*`
}

// Generate blog post fallback content
function generateFallbackBlogPost(title: string, description: string, category: string): string {
  return `# ${title}

## Introduction

${description}

## What is ${category}?

${category} is an important aspect of modern business and technology. It helps organizations streamline their processes and achieve better results.

## Benefits of ${category}

- Improved efficiency
- Better customer engagement
- Cost savings
- Competitive advantage

## How to Implement ${category} in Your Business

1. Start with a clear strategy
2. Choose the right tools
3. Train your team
4. Measure results and iterate

## Conclusion

Implementing ${category} can transform your business and help you stay ahead in today's competitive landscape.

---

*Note: This is a fallback template. Our AI service is currently experiencing high demand. Please try again later for a fully AI-generated blog post.*`
}

// Retry logic for API calls
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: any

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      logger.warn(`API attempt ${attempt} failed: ${error instanceof Error ? error.message : String(error)}`)

      // Don't wait on the last attempt
      if (attempt < maxRetries) {
        // Exponential backoff with jitter
        const delay = Math.min(100 * Math.pow(2, attempt) + Math.random() * 100, 3000)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}

export interface ContentGenerationParams {
  contentType: "product-description" | "blog-post" | "social-media" | "email" | "ad-copy" | "blog_post"
  title: string
  prompt: string
  temperature?: number
  maxLength?: number
  category?: string
  description?: string
}

export async function generateContent({
  contentType,
  title,
  prompt,
  temperature = 0.7,
  maxLength = 1024,
  category = "",
  description = "",
}: ContentGenerationParams) {
  try {
    // Check if API key is available
    if (!apiKey || apiKey.trim() === "") {
      logger.error("Gemini API key is missing")

      // Special handling for blog posts
      if (contentType === "blog_post") {
        return {
          content: generateFallbackBlogPost(title, description, category),
          success: false,
          error: "API key is missing. Using fallback content generation.",
          fallback: true,
        }
      }

      return {
        content: generateFallbackContent(contentType, title, prompt),
        success: false,
        error: "API key is missing. Using fallback content generation.",
        fallback: true,
      }
    }

    // Try to generate content with retries
    return await withRetry(async () => {
      // Select the appropriate model
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

      // Get the prompt template and replace placeholders
      let promptTemplate = ""

      if (contentType === "blog_post") {
        // Use blog-post template for blog_post content type
        promptTemplate = CONTENT_PROMPTS["blog-post"].replace("{title}", title).replace("{prompt}", prompt)
      } else {
        promptTemplate = CONTENT_PROMPTS[contentType].replace("{title}", title).replace("{prompt}", prompt)
      }

      // Generate content
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: promptTemplate }] }],
        safetySettings,
        generationConfig: {
          temperature: temperature,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: maxLength,
        },
      })

      const response = result.response
      const text = response.text()

      return {
        content: text,
        success: true,
      }
    }, 2) // Try up to 2 retries (3 attempts total)
  } catch (error) {
    // Log the full error details
    logger.error("Error generating content with Gemini:", {
      error:
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
            }
          : String(error),
      contentType,
      title,
    })

    // Special handling for blog posts
    if (contentType === "blog_post") {
      return {
        content: generateFallbackBlogPost(title, description, category),
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        fallback: true,
      }
    }

    // Return fallback content
    return {
      content: generateFallbackContent(contentType, title, prompt),
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      fallback: true,
    }
  }
}
