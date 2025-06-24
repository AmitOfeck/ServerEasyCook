import { FridgeModel, IFridgeItem } from '../models/fridge_model';
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.API_KEY });

const allowedUnits = ["gram", "kg", "ml", "liter"];

function parseQuantity(q: string | number | null): number | null {
  if (!q) return null;
  if (typeof q === 'number') return q;
  const n = Number(q);
  if (!isNaN(n)) return n;
  if (typeof q === "string" && q.toLowerCase().includes('half')) return 0.5;
  if (typeof q === "string" && q.toLowerCase().includes('one')) return 1;
  const match = q.match(/^(\d+(\.\d+)?)/);
  if (match) return Number(match[1]);
  return null;
}

export async function identifyFridgeItemsFromImages(
  userId: string,
  images: { mime: string; content: string }[]
) {

    const prompt = `
You will receive image(s) of the inside of a home fridge.
Your task: Identify and extract **every visible food product, ingredient, fruit, vegetable, jar, or container**.
For each item, return a JSON object with ONLY these fields:
- "name": Short English name ("yogurt", "feta cheese", "watermelon", etc.).
- "unit": Must be one of ["gram", "kg", "ml", "liter"] only! (If the amount fits, choose the most reasonable. If not, use "gram" or "ml" by best guess.)
- "quantity": Numeric value only (e.g. 2, 0.5, 350, 1000). Never text.
If you cannot determine unit or quantity, **estimate** (for example, a container = 500ml or 250g, a pack = 250g, a cup = 200ml) and document your guess in the field.

Return ONLY a valid JSON array of objects as described, no markdown or explanation, no extra fields.

Example:
[
  {"name": "milk", "unit": "ml", "quantity": 700},
  {"name": "feta cheese", "unit": "kg", "quantity": 1.35},
  {"name": "graps", "unit": "gram", "quantity": 500}
]
  `.trim();

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          ...images.map((img) => ({
            type: "image_url",
            image_url: {
              url: `data:${img.mime};base64,${img.content}`,
              detail: "auto",
            }
          })),
        ] as any,
      }
    ],
    max_tokens: 900,
    response_format: { type: "text" },
  });

  const text = response.choices?.[0]?.message?.content || "[]";
  console.log("AI RAW RESPONSE:", JSON.stringify(text));
  
  // clean the result
  let cleanText = text.trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```/, '')
    .replace(/```$/, '')
    .replace(/[“”]/g, '"')
    .replace(/\uFEFF/g, '');
  
  // make sure its string
  if (typeof cleanText !== "string") {
    cleanText = String(cleanText);
  }
  
  let aiItems: any[] = [];
  try {
    aiItems = JSON.parse(cleanText);
  } catch (e) {
    console.error("AI did not return valid JSON array:", cleanText);
    throw new Error("Could not extract items from AI response");
  }

  // map units
  const fridgeItems: IFridgeItem[] = aiItems.map((ai: any) => {
    let name = typeof ai.name === "string" && ai.name.trim() ? ai.name.trim() : "unknown item";
    let unit: string = allowedUnits.includes(ai.unit) ? ai.unit : "gram"; // ברירת מחדל: גרם (או ml)
    let quantity: number | null = parseQuantity(ai.quantity);

    if (quantity === null) quantity = 1;

    return { name, unit, quantity };
  });

  let fridge = await FridgeModel.findOne({ userId });
  if (!fridge) {
    fridge = await FridgeModel.create({ userId, items: fridgeItems });
  } else {
    fridge.items = fridgeItems;
    await fridge.save();
  }
  return fridge;
}





export async function getFridge(userId: string) {
  let fridge = await FridgeModel.findOne({ userId });
  if (!fridge) {
    fridge = await FridgeModel.create({ userId, items: [] });
  }
  return fridge;
}

export async function addOrUpdateItem(userId: string, item: IFridgeItem) {
  let fridge = await FridgeModel.findOne({ userId });
  if (!fridge) {
    fridge = await FridgeModel.create({ userId, items: [item] });
    return fridge;
  }
  const idx = fridge.items.findIndex(i => i.name === item.name);
  if (idx >= 0) {
    fridge.items[idx] = item; 
  } else {
    fridge.items.push(item); 
  }
  await fridge.save();
  return fridge;
}

export async function clearFridge(userId: string) {
  const fridge = await FridgeModel.findOneAndUpdate(
    { userId },
    { items: [] },
    { new: true }
  );
  return fridge;
}

