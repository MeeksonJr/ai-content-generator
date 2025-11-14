import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/utils/supabase-env"
import { logger } from "@/lib/utils/logger"

const supabaseUrl = getSupabaseUrl()
const supabaseServiceKey = getSupabaseServiceRoleKey()

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables")
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

function createSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .substring(0, 100)
}

function extractKeywords(content: string): string[] {
  const words = content
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3)

  const wordCount: { [key: string]: number } = {}
  words.forEach((word) => {
    wordCount[word] = (wordCount[word] || 0) + 1
  })

  return Object.entries(wordCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([word]) => word)
}

function estimateReadTime(content: string): string {
  const wordsPerMinute = 200
  const wordCount = content.split(/\s+/).length
  const minutes = Math.ceil(wordCount / wordsPerMinute)
  return `${minutes} min read`
}

async function generateContentWithFallback(prompt: string): Promise<{ content: string; provider: string }> {
  // Try Groq first
  if (process.env.GROQ_API_KEY) {
    try {
      const { generateText } = await import("ai")
      const { groq } = await import("@ai-sdk/groq")

      const { text } = await generateText({
        model: groq("llama-3.1-8b-instant"),
        prompt,
        temperature: 0.7,
      })

      if (text && text.length > 500) {
        return { content: text, provider: "Groq (llama-3.1-8b-instant)" }
      }
    } catch (error) {
      logger.error("Groq content generation failed", {
        context: "BlogGenerate",
        data: { error },
      })
    }
  }

  // Try Gemini as fallback
  if (process.env.GEMINI_API_KEY) {
    try {
      // Use the existing Gemini client instead of @ai-sdk/google wrapper
      const { generateContentWithGemini } = await import("@/lib/ai/gemini-client")
      const text = await generateContentWithGemini(prompt)

      if (text && text.length > 500) {
        return { content: text, provider: "Gemini (gemini-2.0-flash-exp)" }
      }
    } catch (error) {
      logger.error("Gemini content generation failed", {
        context: "BlogGenerate",
        data: { error },
      })
    }
  }

  // Fallback content if both AI providers fail
  return {
    content: generateFallbackContent(prompt),
    provider: "Fallback System",
  }
}

function generateFallbackContent(searchQuery: string): string {
  return `# Complete Guide to ${searchQuery}

## Introduction

Welcome to this comprehensive guide about "${searchQuery}". In today's rapidly evolving digital landscape, understanding this topic has become increasingly important for businesses, professionals, and individuals alike.

## Understanding the Basics

### What You Need to Know

The concept of "${searchQuery}" encompasses several key areas that are worth exploring in detail. Let's break down the fundamental aspects:

- **Core Principles**: Understanding the foundational concepts
- **Practical Applications**: Real-world use cases and implementations
- **Benefits and Advantages**: Why this matters in today's context
- **Challenges and Considerations**: Important factors to keep in mind

### Historical Context

The development of this field has been shaped by various technological and social factors. Understanding this background helps provide context for current trends and future developments.

## Key Components and Features

### Primary Elements

1. **Technical Aspects**: The underlying technology and methodologies
2. **Business Applications**: How organizations are leveraging these concepts
3. **User Experience**: Impact on end-users and stakeholders
4. **Implementation Strategies**: Best practices for adoption

### Advanced Considerations

For those looking to dive deeper, there are several advanced topics worth exploring:

- **Scalability**: How solutions can grow with demand
- **Security**: Protecting data and ensuring privacy
- **Integration**: Working with existing systems and processes
- **Optimization**: Improving performance and efficiency

## Practical Implementation

### Getting Started

If you're looking to implement solutions related to "${searchQuery}", here are some practical steps:

1. **Assessment**: Evaluate your current situation and needs
2. **Planning**: Develop a comprehensive strategy
3. **Pilot Testing**: Start with small-scale implementations
4. **Full Deployment**: Scale up based on pilot results
5. **Monitoring**: Continuously track performance and outcomes

### Best Practices

- **Start Small**: Begin with manageable projects
- **Focus on Value**: Prioritize high-impact initiatives
- **Invest in Training**: Ensure your team has the necessary skills
- **Stay Updated**: Keep up with latest developments and trends

## Benefits and Advantages

### Immediate Benefits

Organizations that successfully implement these concepts typically see:

- **Improved Efficiency**: Streamlined processes and reduced manual work
- **Cost Savings**: Reduced operational expenses and resource optimization
- **Enhanced Quality**: Better outcomes and reduced errors
- **Faster Results**: Accelerated timelines and quicker delivery

### Long-term Advantages

- **Competitive Edge**: Staying ahead of market trends
- **Scalability**: Ability to grow and adapt
- **Innovation**: Foundation for future developments
- **Sustainability**: Long-term viability and success

## Challenges and Solutions

### Common Challenges

1. **Technical Complexity**: Managing sophisticated systems and processes
2. **Resource Constraints**: Limited budget, time, or personnel
3. **Change Management**: Helping teams adapt to new approaches
4. **Integration Issues**: Working with legacy systems

### Proven Solutions

- **Phased Approach**: Implement changes gradually
- **Training Programs**: Invest in skill development
- **Expert Consultation**: Work with experienced professionals
- **Continuous Improvement**: Regular assessment and optimization

## Future Trends and Developments

### Emerging Trends

The field continues to evolve rapidly, with several key trends shaping the future:

- **Automation**: Increased use of automated systems
- **AI Integration**: Artificial intelligence playing a larger role
- **Cloud Solutions**: Migration to cloud-based platforms
- **Mobile-First**: Emphasis on mobile accessibility

### Preparing for the Future

To stay competitive, organizations should:

- **Monitor Trends**: Keep track of industry developments
- **Invest in Innovation**: Allocate resources for research and development
- **Build Partnerships**: Collaborate with technology providers
- **Develop Talent**: Recruit and train skilled professionals

## Conclusion

Understanding and implementing concepts related to "${searchQuery}" can provide significant benefits for organizations and individuals. While there are challenges to overcome, the potential rewards make it a worthwhile investment.

### Key Takeaways

1. **Start with the basics** and build understanding gradually
2. **Focus on practical applications** that deliver real value
3. **Invest in proper planning** and implementation strategies
4. **Stay informed** about trends and developments
5. **Be prepared to adapt** as the field continues to evolve

### Next Steps

If you're ready to move forward with implementing these concepts:

- **Assess your current situation** and identify opportunities
- **Develop a clear strategy** with specific goals and timelines
- **Start with pilot projects** to test approaches
- **Scale successful initiatives** across your organization
- **Continuously monitor and improve** your implementations

This guide provides a foundation for understanding "${searchQuery}" and its applications. As you continue your journey, remember that success comes from combining theoretical knowledge with practical experience and continuous learning.

---

*This content was generated to provide comprehensive information about the requested topic. For the most current and specific information, consider consulting with industry experts and staying updated with the latest developments.*`
}

async function generateImage(title: string): Promise<string | null> {
  if (!process.env.HUGGING_FACE_API_KEY) {
    logger.warn("Hugging Face API key not found, skipping image generation", { context: "BlogGenerate" })
    return null
  }

  const imagePrompt = `Professional blog header image for: "${title}". Modern, clean design, high quality, suitable for a technology blog, 16:9 aspect ratio, vibrant colors, professional lighting`

  const models = [
    "stabilityai/stable-diffusion-xl-base-1.0",
    "runwayml/stable-diffusion-v1-5",
    "black-forest-labs/FLUX.1-dev",
  ]

  for (const model of models) {
    try {
      const response = await fetch(`https://router.huggingface.co/hf-inference/models/${model}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HUGGING_FACE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: imagePrompt,
          parameters: {
            width: 1024,
            height: 576,
            num_inference_steps: 25,
            guidance_scale: 7,
          },
        }),
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText)
        logger.error("Hugging Face API error", {
          context: "BlogGenerate",
          data: { model, status: response.status, error: errorText },
        })
        continue
      }

      const imageBuffer = await response.arrayBuffer()
      const base64Image = Buffer.from(imageBuffer).toString("base64")
      logger.info("Blog header image generated", {
        context: "BlogGenerate",
        data: { model, size: imageBuffer.byteLength },
      })
      return `data:image/png;base64,${base64Image}`
    } catch (error) {
      logger.error("Error generating image", {
        context: "BlogGenerate",
        data: { model, error },
      })
      continue
    }
  }

  logger.warn("All Hugging Face models failed, skipping image", { context: "BlogGenerate" })
  return null
}

export async function POST(request: NextRequest) {
  try {
    logger.info("Blog generate API called", { context: "BlogGenerate" })

    // Parse request body
    let body
    try {
      body = await request.json()
    } catch (error) {
      console.error("[SERVER] Failed to parse request body:", error)
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const { searchQuery, forceRegenerate = false } = body

    if (!searchQuery || typeof searchQuery !== "string") {
      logger.warn("Invalid search query received", { context: "BlogGenerate" })
      return NextResponse.json({ error: "Search query is required" }, { status: 400 })
    }

    const trimmedQuery = searchQuery.trim()
    logger.info("Processing blog query", { context: "BlogGenerate", data: { searchQuery: trimmedQuery } })

    // Check if content already exists (unless force regenerate)
    if (!forceRegenerate) {
      try {
        const { data: existingContent, error: searchError } = await supabase
          .from("blog_content")
          .select("*")
          .ilike("search_query", `%${trimmedQuery}%`)
          .eq("is_published", true)
          .limit(1)
          .maybeSingle()

        if (searchError) {
          console.error("[SERVER] Database search error:", searchError)
        } else if (existingContent) {
          logger.info("Reusing existing content", { context: "BlogGenerate", data: { id: existingContent.id } })
          return NextResponse.json({
            content: existingContent,
            isExisting: true,
          })
        }
      } catch (error) {
        console.error("[SERVER] Error checking existing content:", error)
        // Continue with generation if check fails
      }
    }

    logger.info("Generating new blog content", { context: "BlogGenerate" })

    // Generate content
    const prompt = `Write a comprehensive, well-researched blog post about: "${trimmedQuery}". 

Requirements:
- Minimum 1500 words
- Include practical examples and case studies
- Use proper markdown formatting with headers, subheaders, and bullet points
- Include an introduction, main sections, and conclusion
- Add a call to action at the end
- Include references section
- Make it engaging and informative
- Use professional tone suitable for a business blog

Topic: ${trimmedQuery}`

    const { content: generatedContent, provider: aiProvider } = await generateContentWithFallback(prompt)

    // Extract title from content
    const titleMatch = generatedContent.match(/^#\s*(.+)$/m) || generatedContent.match(/^\*\*(.+)\*\*$/m)
    const title = titleMatch ? titleMatch[1].trim() : `Complete Guide to ${trimmedQuery}`

    // Generate slug
    const slug = createSlug(title)

    // Extract excerpt (first paragraph or first 200 characters)
    const excerptMatch = generatedContent.match(/\n\n(.+?)\n\n/)
    const excerpt = excerptMatch
      ? excerptMatch[1].substring(0, 200) + "..."
      : generatedContent.substring(0, 200) + "..."

    // Extract keywords
    const keywords = extractKeywords(generatedContent)

    // Estimate read time
    const readTime = estimateReadTime(generatedContent)

    // Generate image
    logger.info("Generating blog header image", { context: "BlogGenerate" })
    const imageUrl = await generateImage(title)

    // Save to database
    try {
      logger.info("Saving generated content to database", { context: "BlogGenerate", data: { title } })
      const { data: savedContent, error: saveError } = await supabase
        .from("blog_content")
        .insert({
          title,
          slug,
          content: generatedContent,
          excerpt,
          search_query: trimmedQuery,
          category: "AI Generated",
          author: "AI Content Creator",
          image_url: imageUrl,
          image_prompt: imageUrl ? `Professional blog header image for: "${title}"` : null,
          tags: keywords,
          read_time: readTime,
          view_count: 0,
          is_published: true,
          ai_provider: aiProvider,
        })
        .select()
        .single()

      if (saveError) {
        console.error("[SERVER] Database save error:", saveError)
        return NextResponse.json({ error: "Failed to save content to database" }, { status: 500 })
      }

      logger.info("Blog content saved successfully", {
        context: "BlogGenerate",
        data: { id: savedContent.id },
      })

      return NextResponse.json({
        content: savedContent,
        isExisting: false,
      })
    } catch (error) {
      console.error("[SERVER] Error saving to database:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }
  } catch (error) {
    console.error("[SERVER] Unexpected error in blog generate API:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({ message: "Blog generate API is working!" })
}
