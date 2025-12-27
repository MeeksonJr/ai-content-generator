import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { logger } from "@/lib/utils/logger"
import { createSupabaseRouteClient } from "@/lib/supabase/route-client"
import { handleApiError, AuthenticationError, ValidationError } from "@/lib/utils/error-handler"
import { validateText, validateNumber } from "@/lib/utils/validation"
import { createSecureResponse, handlePreflight } from "@/lib/utils/security"
import { API_CONFIG } from "@/lib/constants/app.constants"

export async function POST(request: NextRequest) {
  try {
    // Handle preflight OPTIONS request
    const preflightResponse = handlePreflight(request)
    if (preflightResponse) return preflightResponse

    const supabase = await createSupabaseRouteClient()

    // Check if user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      const { statusCode, error } = handleApiError(new AuthenticationError(), "Image Generation POST")
      return createSecureResponse(error, statusCode)
    }

    const body = await request.json()
    const { prompt, width = 1024, height = 1024, guidance_scale = 3.5, num_inference_steps = 30 } = body

    // Validate prompt
    const promptValidation = validateText(prompt, {
      minLength: 1,
      maxLength: API_CONFIG.MAX_PROMPT_LENGTH,
      required: true,
    })

    if (!promptValidation.isValid) {
      const { statusCode, error } = handleApiError(
        new ValidationError(`Prompt: ${promptValidation.error}`),
        "Image Generation POST"
      )
      return createSecureResponse(error, statusCode)
    }

    // Validate numeric parameters
    const widthValidation = validateNumber(width, { min: 64, max: 2048 })
    if (!widthValidation.isValid) {
      const { statusCode, error } = handleApiError(
        new ValidationError(`Width: ${widthValidation.error}`),
        "Image Generation POST"
      )
      return createSecureResponse(error, statusCode)
    }

    const heightValidation = validateNumber(height, { min: 64, max: 2048 })
    if (!heightValidation.isValid) {
      const { statusCode, error } = handleApiError(
        new ValidationError(`Height: ${heightValidation.error}`),
        "Image Generation POST"
      )
      return createSecureResponse(error, statusCode)
    }

    const guidanceScaleValidation = validateNumber(guidance_scale, { min: 1, max: 20 })
    if (!guidanceScaleValidation.isValid) {
      const { statusCode, error } = handleApiError(
        new ValidationError(`Guidance scale: ${guidanceScaleValidation.error}`),
        "Image Generation POST"
      )
      return createSecureResponse(error, statusCode)
    }

    const stepsValidation = validateNumber(num_inference_steps, { min: 1, max: 100 })
    if (!stepsValidation.isValid) {
      const { statusCode, error } = handleApiError(
        new ValidationError(`Inference steps: ${stepsValidation.error}`),
        "Image Generation POST"
      )
      return createSecureResponse(error, statusCode)
    }

    const apiKey = process.env.HUGGING_FACE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Hugging Face API key not configured" }, { status: 500 })
    }

    // Try multiple models for image generation
    const models = [
      "black-forest-labs/FLUX.1-dev",
      "stabilityai/stable-diffusion-xl-base-1.0",
      "runwayml/stable-diffusion-v1-5",
    ]

    let imageData = null
    let usedModel = null

    for (const model of models) {
      try {
        logger.info(`Attempting image generation with ${model}`, {
          context: "ImageGeneration",
          data: { prompt, model, width, height },
        })

        const response = await fetch(`https://router.huggingface.co/hf-inference/models/${model}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              width: width,
              height: height,
              guidance_scale: guidance_scale,
              num_inference_steps: num_inference_steps,
            },
          }),
        })

        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer()
          const base64 = Buffer.from(arrayBuffer).toString("base64")
          imageData = `data:image/png;base64,${base64}`
          usedModel = model

          logger.info(`Successfully generated image with ${model}`, {
            context: "ImageGeneration",
            data: { prompt, model, imageSize: arrayBuffer.byteLength },
          })
          break
        } else {
          const errorText = await response.text()
          logger.error(`${model} failed`, {
            context: "ImageGeneration",
            data: { error: errorText, status: response.status },
          })
          continue
        }
      } catch (error) {
        logger.error(`Error with ${model}`, {
          context: "ImageGeneration",
          data: { error: error instanceof Error ? error.message : "Unknown error" },
        })
        continue
      }
    }

    if (!imageData) {
      // Generate a placeholder image if all models fail
      const placeholderSvg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#f3f4f6"/>
          <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="24" fill="#6b7280" text-anchor="middle" dy=".3em">
            Image Generation
          </text>
          <text x="50%" y="60%" font-family="Arial, sans-serif" font-size="16" fill="#9ca3af" text-anchor="middle" dy=".3em">
            ${prompt.substring(0, 50)}${prompt.length > 50 ? "..." : ""}
          </text>
        </svg>
      `
      const base64Svg = Buffer.from(placeholderSvg).toString("base64")
      imageData = `data:image/svg+xml;base64,${base64Svg}`

      logger.info("Generated placeholder image", {
        context: "ImageGeneration",
        data: { prompt, fallback: true },
      })
    }

    // Update usage statistics
    try {
      const currentDate = new Date()
      const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-01`

      const { data: usageStats } = await supabase
        .from("usage_stats")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("month", currentMonth)
        .maybeSingle()

      if (usageStats) {
        const statsData = usageStats as { id: string; api_calls?: number }
        await (supabase as any)
          .from("usage_stats")
          .update({
            api_calls: (statsData.api_calls || 0) + 1,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", statsData.id)
      } else {
        await (supabase as any).from("usage_stats").insert({
          user_id: session.user.id,
          content_generated: 0,
          sentiment_analysis_used: 0,
          keyword_extraction_used: 0,
          text_summarization_used: 0,
          api_calls: 1,
          month: currentMonth,
        } as any)
      }
    } catch (error) {
      logger.error("Error updating usage stats", {
        context: "ImageGeneration",
        data: { error: error instanceof Error ? error.message : "Unknown error" },
      })
    }

    logger.info("Successfully generated image", {
      context: "ImageGeneration",
      userId: session.user.id,
      data: { model: usedModel, fallback: !usedModel },
    })

    return createSecureResponse({
      image: imageData,
      model: usedModel,
      fallback: !usedModel,
    })
  } catch (error) {
    logger.error("Error in image generation API", {
      context: "ImageGeneration",
    }, error as Error)

    const { statusCode, error: apiError } = handleApiError(error, "Image Generation")
    
    // Return a placeholder image on error
    const placeholderSvg = `
      <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f3f4f6"/>
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="32" fill="#ef4444" text-anchor="middle" dy=".3em">
          Image Generation Failed
        </text>
        <text x="50%" y="60%" font-family="Arial, sans-serif" font-size="18" fill="#6b7280" text-anchor="middle" dy=".3em">
          Please try again later
        </text>
      </svg>
    `
    const base64Svg = Buffer.from(placeholderSvg).toString("base64")

    return createSecureResponse({
      image: `data:image/svg+xml;base64,${base64Svg}`,
      fallback: true,
      error: "Image generation service temporarily unavailable",
    }, statusCode)
  }
}
