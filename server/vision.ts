import dotenv from 'dotenv';
dotenv.config({ override: true });

export interface VisionAnalysisResult {
  food_name: string;
  category: 'Fruit' | 'Vegetable' | 'Dairy' | 'Bakery' | 'Meat' | 'Other';
  condition: 'GOOD' | 'BAD' | 'UNCERTAIN';
  confidence: number;
  observations: string;
  recommended_shelf_life_days?: number;
  model_used: string;
  timestamp: string;
}

const SYSTEM_PROMPT = `You are a certified agricultural produce inspector and computer vision food analyst for the "Expiry First Refrigerator" IoT project.
Your job is to inspect an image of a food item (fruit, vegetable, or other produce) captured by a webcam or camera, identify what it is, and evaluate its VISIBLE freshness condition.

CRITICAL VISUAL CONDITION RULES:
- "GOOD": Appears fresh, normal visible coloration, firm/intact skin, no obvious visible mold, no decay, no severe damage.
- "BAD": Evident fungal mold/fuzz, significant dark discoloration, visible rot/oozing, sunken soft spots, shriveling, or severe deterioration.
- "UNCERTAIN": Poor lighting, blurry focus, obstruction, overlapping items, unidentified item, or insufficient visual evidence to guarantee visible quality.
DO NOT guess or force GOOD/BAD if visual evidence is ambiguous.

Supported standard categories: Apple, Banana, Orange, Mango, Grapes, Papaya, Guava, Pomegranate, Watermelon, Pineapple, Tomato, Potato, Onion, Carrot, Cabbage, Spinach, Brinjal, Cucumber, Capsicum, Cauliflower (and any other fruit or vegetable detected).

Return strictly JSON in the following schema:
{
  "food_name": "string (e.g., Apple, Banana, Tomato, etc. Capitalized)",
  "category": "Fruit" | "Vegetable" | "Dairy" | "Bakery" | "Meat" | "Other",
  "condition": "GOOD" | "BAD" | "UNCERTAIN",
  "confidence": 0-100 (integer percentage of visual classification certainty),
  "observations": "string (1-2 sentences stating the specific visual evidence observed)",
  "recommended_shelf_life_days": integer (recommended safe refrigeration shelf life in days if fresh)
}
No markdown fences, no conversational prose, only the raw JSON string.`;

export async function analyzeFoodImage(
  imageBuffer: Buffer,
  mimeType: string = 'image/jpeg',
  clientApiKey?: string
): Promise<VisionAnalysisResult> {
  const apiKey = clientApiKey || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Computer Vision API Key is missing. Please configure GEMINI_API_KEY in the environment or Settings panel.'
    );
  }

  const base64Data = imageBuffer.toString('base64');

  // Try modern Gemini models supported by user's key in order
  const modelsToTry = [
    'gemini-2.5-flash',
    'gemini-flash-latest',
    'gemini-2.5-flash-lite',
    'gemini-3-flash-preview',
    'gemini-2.5-pro',
  ];
  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const requestBody = {
        contents: [
          {
            parts: [
              { text: SYSTEM_PROMPT },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[Vision API] Model ${model} returned HTTP ${response.status}:`, errorText);
        lastError = new Error(`Model ${model} error (${response.status}): ${errorText}`);
        continue;
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error('Empty response from computer vision model.');
      }

      // Clean response text in case fences were returned
      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      // Validate parsed fields
      const conditionUpper = String(parsed.condition || '').toUpperCase();
      const validCondition: 'GOOD' | 'BAD' | 'UNCERTAIN' =
        conditionUpper === 'GOOD' ? 'GOOD' : conditionUpper === 'BAD' ? 'BAD' : 'UNCERTAIN';

      const validCategory: VisionAnalysisResult['category'] = [
        'Fruit',
        'Vegetable',
        'Dairy',
        'Bakery',
        'Meat',
        'Other',
      ].includes(parsed.category)
        ? parsed.category
        : 'Fruit';

      const confidence = Math.min(100, Math.max(10, Math.round(Number(parsed.confidence) || 80)));

      return {
        food_name: parsed.food_name || 'Unidentified Food',
        category: validCategory,
        condition: validCondition,
        confidence,
        observations:
          parsed.observations ||
          (validCondition === 'GOOD'
            ? 'Fresh appearance with typical coloration.'
            : validCondition === 'BAD'
            ? 'Observable signs of decay or spoilage.'
            : 'Visual details inconclusive; manual inspection recommended.'),
        recommended_shelf_life_days: Number(parsed.recommended_shelf_life_days) || 5,
        model_used: model,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      console.warn(`[Vision API] Error with ${model}:`, err.message);
      lastError = err;
    }
  }

  throw (
    lastError ||
    new Error('Computer Vision API failed across all attempted models. Please verify API key and network connection.')
  );
}

