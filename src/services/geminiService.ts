import { GoogleGenAI, Type } from "@google/genai";

export async function parseTradeHistory(htmlContent: string, apiKey?: string) {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Gemini API key is missing. Please provide one in Settings.");
  
  const ai = new GoogleGenAI({ apiKey: key });
  const model = "gemini-3-flash-preview";
  
  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        text: `Extract all closed trade positions from this MT4/MT5 HTML history report. 
        Return a JSON array of objects with the following structure:
        {
          "ticket": "string",
          "openTime": "ISO string",
          "type": "buy" | "sell",
          "size": number,
          "item": "string (symbol)",
          "openPrice": number,
          "closeTime": "ISO string",
          "closePrice": number,
          "profit": number,
          "comment": "string (optional)"
        }
        
        HTML Content:
        ${htmlContent.substring(0, 30000)} // Limit content to avoid token limits, usually enough for history
        `
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            ticket: { type: Type.STRING },
            openTime: { type: Type.STRING },
            type: { type: Type.STRING },
            size: { type: Type.NUMBER },
            item: { type: Type.STRING },
            openPrice: { type: Type.NUMBER },
            closeTime: { type: Type.STRING },
            closePrice: { type: Type.NUMBER },
            profit: { type: Type.NUMBER },
            comment: { type: Type.STRING }
          },
          required: ["ticket", "openTime", "type", "size", "item", "openPrice", "closeTime", "closePrice", "profit"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return [];
  }
}

export async function getTradeInsights(trades: any[], apiKey?: string) {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) return "Gemini API key is missing. Please provide one in Settings to get AI insights.";
  
  const ai = new GoogleGenAI({ apiKey: key });
  const model = "gemini-3-flash-preview";
  
  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        text: `Analyze these trading logs and provide 3-5 key insights or suggestions for improvement in Burmese (Myanmar language). 
        Focus on win rate, risk management, and common mistakes.
        
        CRITICAL: Do NOT use any Markdown formatting characters like #, *, -, or >. 
        Provide the response as plain text paragraphs. Each insight should be a clear, separate paragraph.
        
        Trades:
        ${JSON.stringify(trades.slice(0, 50))}
        `
      }
    ]
  });

  return response.text || "No insights available.";
}
