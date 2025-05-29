import { logger } from "@/lib/utils/logger"

interface GenerateContentParams {
  contentType: string
  title: string
  prompt: string
  maxLength?: number
  temperature?: number
}

interface GenerateContentResult {
  success: boolean
  content: string
  fallback?: boolean
  error?: string
}

export async function generateContent({
  contentType,
  title,
  prompt,
  maxLength = 1000,
  temperature = 0.7,
}: GenerateContentParams): Promise<GenerateContentResult> {
  // Check if we're in a server environment
  if (typeof window !== "undefined") {
    logger.error("Groq client cannot run in browser environment", { context: "GroqClient" })
    return generateFallbackContentForType(contentType, title, prompt)
  }

  // Dynamically import Groq and other dependencies
  try {
    const { default: Groq } = await import("groq-sdk")
    const apiKey = process.env.GROQ_API_KEY

    if (!apiKey) {
      logger.error("Groq API key is missing", { context: "GroqClient" })
      return generateFallbackContentForType(contentType, title, prompt)
    }

    const groq = new Groq({ apiKey })

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an expert content creator. Generate high-quality, engaging content that is SEO-optimized and tailored for business use. Keep the content under ${maxLength} characters.`,
        },
        {
          role: "user",
          content: `Title: ${title}
Prompt: ${prompt}

Generate the content now:`,
        },
      ],
      model: "llama-3.1-8b-instant",
      temperature: temperature,
      max_tokens: 4000,
      top_p: 1,
      stream: false,
    })

    const content = completion.choices[0]?.message?.content

    if (!content || content.trim().length === 0) {
      throw new Error("Empty response from Groq API")
    }

    logger.info("Successfully generated content with Groq", {
      context: "GroqClient",
      data: { contentLength: content.length },
    })

    return {
      success: true,
      content: content.trim(),
    }
  } catch (error) {
    logger.error("Groq API error", {
      context: "GroqClient",
      data: { error: error instanceof Error ? error.message : "Unknown error" },
    })

    // Use fallback content generation
    return generateFallbackContentForType(contentType, title, prompt)
  }
}

function generateFallbackContentForType(contentType: string, title: string, prompt: string): GenerateContentResult {
  logger.info("Generating fallback content", {
    context: "GroqClient",
    data: { contentType, title },
  })

  const fallbackContent = getFallbackContentByType(contentType, title, prompt)

  return {
    success: true,
    content: fallbackContent,
    fallback: true,
  }
}

function getFallbackContentByType(contentType: string, title: string, prompt: string): string {
  switch (contentType) {
    case "blog-post":
    case "blog_post":
      return `# ${title}

## Introduction
${prompt}

## Key Points
- Comprehensive analysis of the topic
- Practical insights and actionable advice
- Real-world examples and case studies
- Expert recommendations and best practices

## Main Content
This topic requires careful consideration and strategic implementation. The key aspects to understand include:

1. **Foundation**: Understanding the core principles and fundamentals
2. **Implementation**: Practical steps for putting knowledge into action
3. **Optimization**: Continuous improvement and refinement strategies
4. **Results**: Measuring success and tracking progress

## Conclusion
By following the guidelines outlined above, you can achieve better results and drive meaningful outcomes. This approach ensures sustainable growth and long-term success.

*This content was generated to provide immediate value while our advanced AI services are being optimized.*`

    case "product-description":
    case "product_description":
      return `**${title}**

${prompt}

**Key Features:**
- Premium quality construction and materials
- User-friendly design and intuitive interface
- Comprehensive functionality and advanced features
- Excellent value proposition and competitive pricing

**Benefits:**
- Saves time and increases operational efficiency
- Improves productivity and overall performance
- Easy to implement and use immediately
- Backed by excellent customer support and service

**Why Choose This Product:**
This solution is perfect for businesses and individuals looking to enhance their operations and achieve better results. With its proven track record and satisfied customer base, you can trust this product to deliver on its promises.

*Experience the difference quality makes - try it today!*`

    case "social-media":
    case "social_media_post":
      return `🚀 ${title}

${prompt}

✨ Key highlights:
• Innovation that drives results
• Quality you can trust
• Community-focused approach
• Proven success stories

#Innovation #Quality #Success #Growth #Business

👉 What are your thoughts? Share your experience in the comments below!

🔗 Learn more and join our community today!`

    case "email":
    case "email_template":
      return `Subject: ${title}

Dear [Name],

${prompt}

We're excited to share this opportunity with you and believe it can make a significant impact on your goals.

**Key Benefits:**
• Immediate value and measurable results
• Simple implementation process
• Ongoing support and guidance
• Proven track record of success

**Next Steps:**
Ready to get started? Simply reply to this email or click the link below to learn more.

We look forward to helping you achieve your objectives.

Best regards,
[Your Name]

P.S. Don't miss out on this limited-time opportunity to transform your approach!`

    default:
      return `# ${title}

${prompt}

This content addresses your specific needs and provides valuable insights for your business. Our AI-powered platform ensures high-quality, engaging content that resonates with your target audience.

**Key Points:**
- Tailored to your specific requirements
- Professional quality and tone
- Optimized for engagement and results
- Ready to use immediately

For more personalized and detailed content generation, please try again when our full AI services are available.

*Generated with care to provide immediate value while maintaining quality standards.*`
  }
}
