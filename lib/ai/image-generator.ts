import { logger } from "@/lib/utils/logger"

const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY
const FLUX_MODEL = "black-forest-labs/FLUX.1-dev"

interface ImageGenerationResult {
  success: boolean
  imageUrl?: string
  error?: string
}

export async function generateBlogImage(title: string): Promise<ImageGenerationResult> {
  try {
    if (!HUGGING_FACE_API_KEY) {
      logger.warn("Hugging Face API key not found", { context: "ImageGeneration" })
      return { success: false, error: "API key not configured" }
    }

    // Create a descriptive prompt for the blog image
    const prompt = `A professional, modern blog header image for an article titled "${title}". Clean, minimalist design with subtle technology elements, soft lighting, high quality, 16:9 aspect ratio, suitable for a tech blog`

    logger.info("Generating blog image", {
      context: "ImageGeneration",
      data: { title, prompt: prompt.substring(0, 100) + "..." },
    })

    const response = await fetch(`https://api-inference.huggingface.co/models/${FLUX_MODEL}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HUGGING_FACE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          height: 512,
          width: 896, // 16:9 aspect ratio
          guidance_scale: 3.5,
          num_inference_steps: 20, // Reduced for faster generation
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error("Hugging Face API error", {
        context: "ImageGeneration",
        data: { status: response.status, error: errorText },
      })
      return { success: false, error: `API error: ${response.status}` }
    }

    // Check if the response is an image
    const contentType = response.headers.get("content-type")
    if (!contentType || !contentType.startsWith("image/")) {
      const responseText = await response.text()
      logger.error("Unexpected response type", {
        context: "ImageGeneration",
        data: { contentType, response: responseText.substring(0, 200) },
      })
      return { success: false, error: "Invalid response format" }
    }

    // Convert the image to base64 data URL
    const imageBuffer = await response.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString("base64")
    const imageUrl = `data:${contentType};base64,${base64Image}`

    logger.info("Successfully generated blog image", {
      context: "ImageGeneration",
      data: { title, imageSize: imageBuffer.byteLength },
    })

    return { success: true, imageUrl }
  } catch (error) {
    logger.error("Error generating blog image", { context: "ImageGeneration" }, error as Error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}
