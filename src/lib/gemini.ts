import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy_key" });

export interface ThermalAnalysis {
  maxTemp: number | null;
  hotSpotsCount: number;
  points: { label: string; temp: number }[];
}

export async function analyzeImage(imageBase64: string, type: 'acoustic' | 'thermal'): Promise<number | ThermalAnalysis | null> {
  try {
    const model = "gemini-3-flash-preview";
    
    if (type === 'acoustic') {
      const prompt = "This is an image from an acoustic camera. Please look for the sound level (dB) value displayed in the image. Return only the number. If you cannot find it, return null.";
      const response = await ai.models.generateContent({
        model,
        contents: {
          parts: [
            { inlineData: { mimeType: "image/png", data: imageBase64.split(',')[1] } },
            { text: prompt },
          ],
        },
      });
      const text = response.text;
      if (!text) return null;
      const match = text.match(/(\d+(\.\d+)?)/);
      return match ? parseFloat(match[0]) : null;
    } else {
      const prompt = `This is a thermal imaging photo with multiple measurement points (e.g., P0, P1, P2...). 
      1. Identify all labeled points and their corresponding temperatures.
      2. Find the maximum temperature among these points.
      3. Identify how many points are significantly hotter than the others (potential hot spots).
      Return the result in JSON format: 
      { 
        "maxTemp": number, 
        "hotSpotsCount": number, 
        "points": [{ "label": "string", "temp": number }] 
      }
      If you cannot find any points, look for any temperature value displayed and return it as maxTemp.
      If no temperature is found, return null.`;

      const response = await ai.models.generateContent({
        model,
        contents: {
          parts: [
            { inlineData: { mimeType: "image/png", data: imageBase64.split(',')[1] } },
            { text: prompt },
          ],
        },
        config: { responseMimeType: "application/json" }
      });

      const text = response.text;
      if (!text) return null;
      try {
        const result = JSON.parse(text);
        return {
          maxTemp: result.maxTemp || null,
          hotSpotsCount: result.hotSpotsCount || 0,
          points: result.points || []
        };
      } catch (e) {
        const match = text.match(/(\d+(\.\d+)?)/);
        return match ? { maxTemp: parseFloat(match[0]), hotSpotsCount: 1, points: [] } : null;
      }
    }
  } catch (error) {
    console.error("Error analyzing image:", error);
    return null;
  }
}
