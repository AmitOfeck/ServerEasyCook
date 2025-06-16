import { OpenAI } from 'openai';
import { ISuperProduct } from '../models/super_model';
import { SearchCriteria } from '../services/search_service';

const openai = new OpenAI({
  apiKey: process.env.API_KEY || '',
});

export function buildGetBulkRelevantProductsWoltGPTPrompt(products: ISuperProduct[][], queries: string[]): string {
  const input = queries.map((query, i) => ({
    productName: query,
    searchResults: products[i].map(p => p.name),
  }));

  return `You are helping select relevant products for a recipe.
          I'm giving you an input in the following format:
          [
            {
              "productName": string,
              "searchResults": string[]
            },
            ...
          ]

          Input:
          ${JSON.stringify(input, null, 2)}

          For each productName, select which products from the searchResults are relevant to the search. Use common sense and match products closely.

          IMPORTANT: Return ONLY a valid JSON array of objects in this format, without any extra text or markdown:
          [
            {
              "productName": string,
              "relevantProducts": string[]
            },
            ...
          ]`;
}

export function buildGetBulkRelevantProductsCacheGPTPrompt(products: ISuperProduct[], queries: string[]): string {
  const options = products.map(p => p.name);

  return `You are helping select relevant products for a recipe.
          Products names: ${queries.join(", ")},
          Store product options: 
          ${options}

          For each productName, select which products from the options are relevant to the search. Use common sense and match products closely.

          IMPORTANT: Return ONLY a valid JSON array of objects in this format, without any extra text or markdown:
          [
            {
              "productName": string,
              "relevantProducts": string[]
            },
            ...
          ]`;
}

export function buildGenerateRecepiesPrompt(criteria: SearchCriteria): string {
  const { name, priceMin, cuisine, limitation, level, numberOfDishes } = criteria;
  return `Based on the following criteria:
Name: ${name || 'any'},
Price:"${priceMin || '0'} to ${criteria.priceMax || 'any'} for all recipe in nis",
Cuisine: ${cuisine || 'any'},
Dietary Limitations: ${limitation || 'none'},
Difficulty Level: ${level || 'any'},
NumberOfDishes: ${1 || '1'},
please suggest three unique dish recommendations.
note:
 "dishCalories" - per one dish.
 ingredientsCost - the cost of all ingredients in nis.
  "averageDishCost" - the average cost of a dish based on the ingredients per one dish in nis.
  "price" - the price of the all recipe in nis.
IMPORTANT: Return ONLY a valid JSON array in the following format, without any additional text or markdown:
[
  {
    "name": string,
    "ingredients": [{ "name": string, "unit": string , "quantity": number , "cost": number}],
    "details": string,
    "recipe": string,
    "dishCalories": number,
    "ingredientsCost": number,
    "averageDishCost": number,
    "price": number
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
    max_tokens: 2000,
    temperature: 0.7,
  });

  let content = response.choices[0].message?.content?.trim() || '';
  if (content.startsWith('```json')) {
    content = content.replace(/```json/, '').replace(/```/, '').trim();
  }
  return content;
}

