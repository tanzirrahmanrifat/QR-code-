
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types";

export const analyzeDesignWithAI = async (url: string, logoBase64?: string): Promise<AIAnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const contents: any[] = [
    { text: `Analyze this URL: ${url}. Suggest a professional color palette (hex codes), a short catchy title for a QR code display, and a brand tone. If an image is provided, ensure the colors complement the logo.` }
  ];

  if (logoBase64) {
    contents.push({
      inlineData: {
        mimeType: "image/png",
        data: logoBase64.split(',')[1]
      }
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: contents },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedColors: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of 3 hex color codes that represent the brand"
            },
            suggestedDescription: {
              type: Type.STRING,
              description: "A short slogan or title for the QR code"
            },
            brandTone: {
              type: Type.STRING,
              description: "The mood or tone of the design (e.g. Modern, Playful, Corporate)"
            }
          },
          required: ["suggestedColors", "suggestedDescription", "brandTone"]
        }
      }
    });

    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return {
      suggestedColors: ["#000000", "#ffffff", "#3b82f6"],
      suggestedDescription: "Scan to visit",
      brandTone: "Neutral"
    };
  }
};
