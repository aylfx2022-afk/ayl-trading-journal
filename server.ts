import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API routes FIRST
  app.post("/api/analyze-chart", async (req, res) => {
    try {
      const { imageUrl, provider = "gemini", apiKey: userApiKey } = req.body;

      if (!imageUrl) {
        return res.status(400).json({ error: "Image URL is required" });
      }

      const effectiveProvider = provider || 'gemini';
      let apiKey = userApiKey;

      if (effectiveProvider === 'gemini') {
        apiKey = process.env.GEMINI_API_KEY || userApiKey;
        if (!apiKey) {
          return res.status(400).json({ error: "Gemini API Key is not configured on the server. Please set GEMINI_API_KEY in Vercel Environment Variables or .env file." });
        }
      } else if (effectiveProvider === 'openrouter') {
        apiKey = process.env.OPENROUTER_API_KEY || userApiKey;
        if (!apiKey) {
          return res.status(400).json({ error: "OpenRouter API Key is not configured on the server. Please set OPENROUTER_API_KEY in Vercel Environment Variables or .env file." });
        }
      }

      // Fetch image and convert to base64
      let base64Image = "";
      let mimeType = "image/png";

      try {
        const trimmedUrl = imageUrl.trim();
        const tvMatch = trimmedUrl.match(/tradingview\.com\/x\/([a-zA-Z0-9]+)/);
        
        if (tvMatch) {
          const id = tvMatch[1];
          // List of URLs to try for TradingView
          const urlsToTry = [
            `https://s3.tradingview.com/x/${id}.png`,
            `https://www.tradingview.com/x/${id}.png`
          ];

          const headerConfigs = [
            // 1. Browser impersonation with Referer and Origin (S3 Bucket Referer policy check)
            {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Referer": "https://www.tradingview.com/",
              "Origin": "https://www.tradingview.com",
              "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
              "Accept-Language": "en-US,en;q=0.9"
            },
            // 2. Direct S3 Fetch with precise referer pointing to screenshot page
            {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Referer": `https://www.tradingview.com/x/${id}/`,
              "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8"
            },
            // 3. Simple modern browser agent (clean headers)
            {
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
              "Accept": "image/webp,image/apng,image/png,image/*,*/*;q=0.8"
            },
            // 4. No headers (raw fetch)
            {}
          ];

          let lastError = null;
          let success = false;

          for (const url of urlsToTry) {
            for (const headers of headerConfigs) {
              try {
                console.log(`Trying to fetch from: ${url}`);
                const response = await fetch(url, { headers, method: 'GET' });
                if (response.ok) {
                  const arrayBuffer = await response.arrayBuffer();
                  base64Image = Buffer.from(arrayBuffer).toString('base64');
                  mimeType = response.headers.get('content-type') || 'image/png';
                  success = true;
                  break;
                } else {
                  lastError = new Error(`Status ${response.status}: ${response.statusText}`);
                }
              } catch (err: any) {
                lastError = err;
              }
            }
            if (success) break;
          }

          if (!success) {
            // HTML parser fallback: Fetch the page and find the meta property="og:image" tag
            try {
              const pageUrl = `https://www.tradingview.com/x/${id}/`;
              console.log(`Trying HTML page fallback at ${pageUrl}`);
              const response = await fetch(pageUrl, {
                headers: {
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
                }
              });
              if (response.ok) {
                const html = await response.text();
                const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) || 
                                    html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
                if (ogImageMatch && ogImageMatch[1]) {
                  const ogImageUrl = ogImageMatch[1];
                  console.log(`Found og:image in HTML: ${ogImageUrl}`);
                  for (const headers of headerConfigs) {
                    try {
                      const imgRes = await fetch(ogImageUrl, { headers });
                      if (imgRes.ok) {
                        const arrayBuffer = await imgRes.arrayBuffer();
                        base64Image = Buffer.from(arrayBuffer).toString('base64');
                        mimeType = imgRes.headers.get('content-type') || 'image/png';
                        success = true;
                        break;
                      }
                    } catch (e) {}
                  }
                }
              }
            } catch (err) {
              console.error("HTML parsing fallback failed:", err);
            }
          }

          if (!success) {
            throw lastError || new Error("Failed all direct and fallback attempts to load the chart image.");
          }

        } else {
          // General direct image URL
          const imageRes = await fetch(trimmedUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
          });
          if (!imageRes.ok) {
            throw new Error(`Failed to fetch general image: ${imageRes.statusText}`);
          }
          const arrayBuffer = await imageRes.arrayBuffer();
          base64Image = Buffer.from(arrayBuffer).toString('base64');
          mimeType = imageRes.headers.get('content-type') || 'image/png';
        }
      } catch (err: any) {
        console.error("Error fetching chart image:", err);
        return res.status(400).json({ error: `Could not load or download the chart image: ${err.message}` });
      }

      const prompt = `You are an expert TradingView chart analysis tool.
Your job is to look at the chart image, find the 'Long Position' or 'Short Position' drawing tool (which is a box with a green target zone and a red risk zone meeting at a central entry line), and extract:
1. Entry Price: The price on the central boundary where the red and green zones meet.
2. Stop Loss (SL) Price: The price at the outer edge of the red zone.
3. Take Profit (TP) Price: The price at the outer edge of the green zone.
4. Trade Type: 'buy' if the green zone is on top (Long Position), 'sell' if the green zone is on bottom (Short Position).
5. Currency Pair/Asset Name: The trading symbol (e.g., EUR/USD, GBP/USD, XAU/USD, BTC/USD, etc.) usually displayed in the top-left corner or title bar. Please normalize it with a slash (e.g., EUR/USD) or match one of standard symbols.
6. Timeframe: The chart timeframe (e.g., 1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w) visible next to the symbol. Normalize to standard presets if possible: 1m, 3m, 5m, 15m, 30m, 1h, 4h, 1d, 1w.

Analyze the visual labels on the price Y-axis on the right, or the small floating numbers inside/around the drawing box (which show Target, Stop, etc.).
Extract the exact numeric price values.
Return a structured JSON object with entryPrice, slPrice, tpPrice, type, confidence, message, pair, and entryTimeframe.`;

      if (provider === "gemini") {
        const ai = new GoogleGenAI({
          apiKey: apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Image,
              }
            },
            {
              text: prompt
            }
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                entryPrice: { type: Type.NUMBER, description: "Entry Price value" },
                slPrice: { type: Type.NUMBER, description: "Stop Loss Price value" },
                tpPrice: { type: Type.NUMBER, description: "Take Profit Price value" },
                type: { type: Type.STRING, description: "The trade direction: 'buy' or 'sell'" },
                confidence: { type: Type.NUMBER, description: "Confidence score between 0 and 1" },
                message: { type: Type.STRING, description: "Brief explanation of how values were found" },
                pair: { type: Type.STRING, description: "The currency pair or asset name found on the chart (e.g., EUR/USD, XAU/USD, GBP/USD, US30, etc.)" },
                entryTimeframe: { type: Type.STRING, description: "The chart timeframe found (e.g., 1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w, etc.)" }
              },
              required: ["entryPrice", "slPrice", "tpPrice", "type"]
            }
          }
        });

        const text = response.text;
        if (!text) {
          throw new Error("No response received from Gemini");
        }

        const data = JSON.parse(text);
        return res.json(data);

      } else if (provider === "openrouter") {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://ai.studio/build",
            "X-Title": "Trading Journal AI"
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: prompt + "\nOutput raw JSON conforming to this schema: { entryPrice: number, slPrice: number, tpPrice: number, type: 'buy' | 'sell', confidence: number, message: string, pair?: string, entryTimeframe?: string }"
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Extract prices from this chart."
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${mimeType};base64,${base64Image}`
                    }
                  }
                ]
              }
            ],
            response_format: { type: "json_object" }
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`OpenRouter API error: ${response.statusText} - ${errText}`);
        }

        const resData = await response.json();
        const content = resData.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error("Empty response from OpenRouter");
        }

        const data = JSON.parse(content);
        return res.json(data);
      } else {
        return res.status(400).json({ error: "Invalid AI provider" });
      }

    } catch (err: any) {
      console.error("AI Analysis error:", err);
      return res.status(500).json({ error: err.message || "An error occurred during AI analysis." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
