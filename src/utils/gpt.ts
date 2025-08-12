import { OpenAI } from 'openai';
import { ISuperProduct } from '../models/super_model';
import { SearchCriteria } from '../services/search_service';
import { IFridgeItem } from '../models/fridge_model'; 
import { IDish } from '../models/dish_model';

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

export function buildGenerateRecepiesPrompt(criteria: SearchCriteria, fridgeItems?: IFridgeItem[]): string {
  const { name, priceMin, cuisine, limitation, level, numberOfDishes, prompt } = criteria;

  let fridgeSection = '';
  if (fridgeItems && fridgeItems.length > 0) {
    const fridgeItemsText = fridgeItems.map(item => {
      if (item.quantity && item.unit) {
        return `- ${item.name}: ${item.quantity} ${item.unit}`;
      }
      return `- ${item.name}`;
    }).join('\n');

    fridgeSection = `\nAvailable ingredients: ${fridgeItemsText}`;
  }

  const header = prompt
    ? `User Request: "${prompt}"

Please create dishes that satisfy **all** the constraints below.  
If any element of the user's request is **irrelevant, contradictory, or impossible** given these
constraints, safely ignore or adapt that element while still producing the *closest* matching dishes:`
    : 'Based on the following criteria:';

  return `${header}
Name: ${name || 'any'},
Price: "${priceMin || 0} to ${criteria.priceMax || 'any'} for all recipe in NIS",
Cuisine: ${cuisine || 'any'},
Dietary Limitations: ${limitation || 'none'},
Difficulty Level: ${level || 'any'},
NumberOfDishes: ${numberOfDishes || 1},
${fridgeSection},

Please suggest ${numberOfDishes || 1} unique dish recommendation${(numberOfDishes || 1) > 1 ? 's' : ''}.${fridgeItems && fridgeItems.length > 0 ? ' Prioritize recipes that make good use of the available ingredients.' : ''}

Note:
- "dishCalories" – calories per single dish  
- "ingredientsCost" – total cost of ingredients in NIS  
- "averageDishCost" – average cost per dish in NIS  
- "price" – total recipe price in NIS
-"cuisine" - the cuisine of the dish from the following options: "ITALIAN","CHINESE","INDIAN","MEXICAN".
-"level" - the difficulty level of the dish from the following options: "EASY","MEDIUM","HARD".
-"limitation" - the dietary restriction of the dish if any, from the following options: "GLUTEN_FREE","VEGETARIAN","VEGAN","NONE".


IMPORTANT: Return ONLY a valid JSON array in the following format, without any additional text or markdown:
[
  {
    "name": string,
    "ingredients": [{ "name": string, "unit": string, "quantity": number, "cost": number }],
    "details": string,
    "recipe": string,
    "dishCalories": number,
    "ingredientsCost": number,
    "averageDishCost": number,
    "price": number
    "cuisine": string,
    "level": string
    "limitation": string
  },
  ...
]`;
}

export function buildGenerateRecommendedDishesPrompt(
  madeDishes: IDish[],
  allDishesFromDB: IDish[],
  numberOfRecommendations: number = 10
): string {
  const madeDishNames = madeDishes.map((dish, i) => `${i + 1}. ${dish.name}`).join('\n');
  const allDishesList = allDishesFromDB
    .map((dish, i) => `${i + 1}. ${dish.name} (ID: ${dish._id})`)
    .join('\n');

  return `
The user previously cooked the following dishes:
${madeDishNames}

Below is the full list of available dishes in the database, each with a unique ID:
${allDishesList}

Your task:
1. Analyze the user's previous dishes to detect preferences (e.g., ingredients, cuisine, cooking method, dietary restrictions, etc.).
2. Based on those preferences, select the top ${numberOfRecommendations} most suitable dishes from the database.
3. Return ONLY their IDs in a valid JSON array, without any explanation, markdown, or extra text.

Example output format:
["abc123", "xyz789", "dish456"]
`.trim();
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

