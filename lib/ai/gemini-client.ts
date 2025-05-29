import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function generateContentWithGemini(prompt: string): Promise<string> {
  try {
    console.log("Gemini: Generating content...")

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })

    const result = await model.generateContent(prompt)
    const response = await result.response
    const content = response.text()

    if (!content) {
      throw new Error("No content generated from Gemini")
    }

    console.log("Gemini: Content generated successfully")
    return content
  } catch (error) {
    console.error("Gemini generation error:", error)
    throw error
  }
}

// Export alias for backward compatibility
export const generateContent = generateContentWithGemini
