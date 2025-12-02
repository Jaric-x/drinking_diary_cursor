import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';

// Initialize the client
const ai = new GoogleGenAI({ apiKey });

/**
 * Edits an image using Gemini 2.5 Flash Image based on a text prompt.
 * @param base64Image The source image in base64 format (no data:image/ prefix ideally, but we will clean it)
 * @param prompt The editing instruction (e.g., "Add a retro filter")
 * @returns The generated image as a base64 string
 */
export const editImageWithGemini = async (base64Image: string, prompt: string, mimeType: string = 'image/jpeg'): Promise<string | null> => {
  if (!apiKey) {
    console.error("API Key is missing");
    throw new Error("API Key is missing");
  }

  try {
    // Clean base64 string if it contains the header
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: cleanBase64,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      // No schema or mimeType needed for Nano Banana (Flash Image)
    });

    // Extract image from response
    // Iterate through parts to find the image
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }

    return null;

  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
};
