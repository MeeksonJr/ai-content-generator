import { type NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/utils/logger"
import { validateText } from "@/lib/utils/validation"
import { createSecureResponse, handlePreflight } from "@/lib/utils/security"
import { API_CONFIG, CONTENT_TYPES } from "@/lib/constants/app.constants"

function createSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
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

      const { text: generatedContent } = await generateText({
        model: groq("llama-3.1-8b-instant"),
        prompt,
        temperature: 0.7,
      })

      if (generatedContent && generatedContent.length > 500) {
        return { content: generatedContent, provider: "Groq (llama-3.1-8b-instant)" }
      }
    } catch (error) {
      logger.error("Groq content generation failed", { context: "GenerateAPI" }, error as Error)
    }
  }

  // Try Gemini as fallback
  if (process.env.GEMINI_API_KEY) {
    try {
      // Use the existing Gemini client instead of @ai-sdk/google wrapper
      const { generateContentWithGemini } = await import("@/lib/ai/gemini-client")
      const generatedContent = await generateContentWithGemini(prompt)

      if (generatedContent && generatedContent.length > 500) {
        return { content: generatedContent, provider: "Gemini (gemini-2.0-flash-exp)" }
      }
    } catch (error) {
      logger.error("Gemini content generation failed", { context: "GenerateAPI" }, error as Error)
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

## Understanding the Core Concepts

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

Several trends are shaping the future of this landscape:

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

export async function POST(request: NextRequest) {
  try {
    // Handle preflight OPTIONS request
    const preflightResponse = handlePreflight(request)
    if (preflightResponse) return preflightResponse

    console.log("[API] Generate route called")

    const body = await request.json()
    const { prompt, title, contentType, temperature = 0.7, maxLength = 1000 } = body

    // Validate prompt
    const promptValidation = validateText(prompt, {
      minLength: 1,
      maxLength: API_CONFIG.MAX_CONTENT_LENGTH,
      required: true,
    })

    if (!promptValidation.isValid) {
      return createSecureResponse({ error: `Prompt: ${promptValidation.error}` }, 400)
    }

    // Validate title if provided
    if (title) {
      const titleValidation = validateText(title, {
        maxLength: API_CONFIG.MAX_TITLE_LENGTH,
      })
      if (!titleValidation.isValid) {
        return createSecureResponse({ error: `Title: ${titleValidation.error}` }, 400)
      }
    }

    // Validate temperature
    if (temperature !== undefined && (temperature < 0 || temperature > 2)) {
      return createSecureResponse({ error: "Temperature must be between 0 and 2" }, 400)
    }

    // Validate maxLength
    if (maxLength !== undefined && (maxLength < 100 || maxLength > API_CONFIG.MAX_CONTENT_LENGTH)) {
      return createSecureResponse(
        { error: `Max length must be between 100 and ${API_CONFIG.MAX_CONTENT_LENGTH}` },
        400
      )
    }

    console.log("[API] Request body:", { prompt: promptValidation.sanitized!.substring(0, 100), title, contentType })

    // Generate content with fallback
    const { content, provider } = await generateContentWithFallback(promptValidation.sanitized!)

    // Extract keywords from generated content
    const keywords = extractKeywords(content)

    // Simple sentiment analysis (basic implementation)
    const sentiment =
      content.toLowerCase().includes("great") ||
      content.toLowerCase().includes("excellent") ||
      content.toLowerCase().includes("amazing")
        ? "positive"
        : content.toLowerCase().includes("bad") ||
            content.toLowerCase().includes("terrible") ||
            content.toLowerCase().includes("awful")
          ? "negative"
          : "neutral"

    const response = {
      content,
      keywords,
      sentiment,
      provider,
      fallback: provider === "Fallback System",
      readTime: estimateReadTime(content),
      wordCount: content.split(/\s+/).length,
    }

    console.log("[API] Response prepared:", {
      contentLength: content.length,
      keywordsCount: keywords.length,
      provider,
      fallback: response.fallback,
    })

    return createSecureResponse(response)
  } catch (error) {
    console.error("[API] Error in generate route:", error)

    return createSecureResponse(
      {
        error: "Internal server error during content generation",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    )
  }
}
