import { OpenAI } from 'openai';
import { ISuperProduct } from '../models/super_model';
import { SearchCriteria } from '../services/search_service';

const openai = new OpenAI({
  apiKey: process.env.API_KEY || '',
});

export function buildGetRelevantProductsGPTPrompt(products: ISuperProduct[], query: string): string {
  const options = products.map(product => product.name).join(",\n   ");
  return `I want to make a recipe - I search for a product in the store:
          Product name: ${query},
          Store product options: 
          ${options}
          What products from the options are relevant to my search? Use common sense and narrow the list down.

          IMPORTANT: Return ONLY a valid JSON array in the following format, without any additional text or markdown:
          [
            {
              "name": string
            },
            ...
          ]`;
}

export function buildGenerateRecepiesPrompt(criteria: SearchCriteria): string {
  const { name, priceMin, cuisine, limitation, level, numberOfDishes } = criteria;
  return `Based on the following criteria:
Name: ${name || 'any'},
Price: ${priceMin || 'any'},
Cuisine: ${cuisine || 'any'},
Dietary Limitations: ${limitation || 'none'},
Difficulty Level: ${level || 'any'},
NumberOfDishes: ${numberOfDishes || 'any'},
please suggest three unique dish recommendations.
IMPORTANT: Return ONLY a valid JSON array in the following format, without any additional text or markdown:
[
  {
    "name": string,
    "ingredients": [{ "name": string, "unit": string , "quantity": number , "cost": number}],
    "details": string,
    "recipe": string,
    "dishCalories": number,
    "ingredientsCost": number,
    "averageDishCost": number
  },
  ...
]`;
}

export async function sendPromptToChatGPT(prompt: string, systemMessage: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: prompt }
    ],
    max_tokens: 1000,
    temperature: 0.7,
  });

  let content = response.choices[0].message?.content?.trim() || '';
  if (content.startsWith('```json')) {
    content = content.replace(/```json/, '').replace(/```/, '').trim();
  }
  return content;
}

