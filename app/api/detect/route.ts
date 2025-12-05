import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export interface DetectedFeature {
  type: "lawn" | "roof" | "driveway" | "pool" | "deck" | "patio" | "fence" | "garden";
  confidence: number;
  description: string;
  estimatedArea: number; // in square meters
  bounds: {
    // Percentage-based bounds relative to image (0-100)
    top: number;
    left: number;
    width: number;
    height: number;
  };
  color?: string;
}

export interface DetectionResult {
  features: DetectedFeature[];
  propertyAnalysis: string;
  recommendations: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, mapBounds, zoomLevel } = await request.json();

    if (!imageBase64) {
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured. Please add OPENAI_API_KEY to environment variables." },
        { status: 500 }
      );
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Calculate approximate scale based on zoom level
    const metersPerPixel = 156543.03392 * Math.cos(mapBounds?.center?.lat * Math.PI / 180 || 0) / Math.pow(2, zoomLevel || 19);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert aerial imagery analyst specializing in property assessment for trades and services.

IMPORTANT: You must ONLY analyze the SINGLE property at the CENTER of the image. This is the property that was searched for. Ignore all neighboring properties.

Your task is to identify distinct areas on the CENTER PROPERTY ONLY that could be quoted for services like lawn care, roofing, pressure washing, etc.

For each detected feature on the CENTER PROPERTY, provide:
1. Type (lawn, roof, driveway, pool, deck, patio, fence, garden)
2. Confidence level (0-1)
3. Brief description
4. Estimated area in square meters
5. PRECISE bounds as percentages of the image (top, left, width, height from 0-100) - these must accurately outline the feature
6. Primary color observed

CRITICAL RULES:
- ONLY detect features on the CENTER property (the one in the middle of the image)
- DO NOT include any features from neighboring properties
- The bounds must be PRECISE and TIGHT around each feature - not loose rectangles
- If a feature is partially visible at the edge of the property, only include the part within the center property

Typical Australian residential property sizes:
- Front lawn: 50-150 m²
- Back lawn: 100-300 m²
- Roof (main house): 150-250 m²
- Garage/shed roof: 30-50 m²
- Driveway: 30-80 m²
- Pool: 20-50 m²
- Deck/Patio: 20-60 m²

Return your analysis as valid JSON matching this exact structure:
{
  "features": [
    {
      "type": "lawn|roof|driveway|pool|deck|patio|fence|garden",
      "confidence": 0.0-1.0,
      "description": "string",
      "estimatedArea": number,
      "bounds": { "top": 0-100, "left": 0-100, "width": 0-100, "height": 0-100 },
      "color": "string"
    }
  ],
  "propertyAnalysis": "Brief description of the CENTER property only",
  "recommendations": ["Service recommendation 1", "Service recommendation 2"]
}`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this aerial/satellite image. The image shows approximately ${Math.round(metersPerPixel * 800)}m x ${Math.round(metersPerPixel * 600)}m.

IMPORTANT: Only analyze the property at the EXACT CENTER of this image. This is the searched address. Ignore all surrounding properties.

For the CENTER PROPERTY ONLY, detect:
- Lawn/grass areas (front and back separately if visible)
- Roof sections (main house, garage, sheds)
- Driveway and pathways
- Pool (if present)
- Deck or patio areas
- Fencing (around this property only)
- Garden beds

Provide PRECISE bounds that tightly fit each feature. The bounds are percentages of the image dimensions (0-100).

Return ONLY valid JSON, no markdown or explanations.`
            },
            {
              type: "image_url",
              image_url: {
                url: imageBase64.startsWith("data:")
                  ? imageBase64
                  : `data:image/png;base64,${imageBase64}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.2, // Lower temperature for more precise/consistent results
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    // Parse the JSON response
    let result: DetectionResult;
    try {
      // Remove any markdown code blocks if present
      const jsonStr = content.replace(/```json\n?|\n?```/g, "").trim();
      result = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      return NextResponse.json(
        { error: "Failed to parse AI response", raw: content },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Detection error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Detection failed" },
      { status: 500 }
    );
  }
}
