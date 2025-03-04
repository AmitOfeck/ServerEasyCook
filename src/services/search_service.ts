import { v4 as uuidv4 } from 'uuid';
import { OpenAI } from 'openai';

import { Cuisine, Limitation, Level, IDish, DishModel } from '../models/dish_model';

export interface SearchCriteria {
  name?: string;
  price?: number;
  cuisine?: Cuisine;
  limitation?: Limitation;
  level?: Level;
}

// --- Database Functions ---

export async function searchInDB(criteria: SearchCriteria): Promise<IDish[]> {
  const query: any = {};
  if (criteria.name) {
    query.name = { $regex: criteria.name, $options: 'i' };
  }
  if (criteria.price !== undefined) {
    query.price = criteria.price;
  }
  if (criteria.cuisine) {
    query.cuisine = criteria.cuisine;
  }
  if (criteria.limitation) {
    query.limitation = criteria.limitation;
  }
  if (criteria.level) {
    query.level = criteria.level;
  }
  return await DishModel.find(query).exec();
}

export async function saveDishes(dishes: any[]): Promise<void> {
  await DishModel.insertMany(dishes);
}

// --- ChatGPT API Integration ---

// Instantiate the OpenAI client with your API key (make sure it's loaded from .env)
const openai = new OpenAI({
 apiKey: "your-api-key-here",
});

export function buildGPTPrompt(criteria: SearchCriteria): string {
  const { name, price, cuisine, limitation, level } = criteria;
  return `Based on the following criteria:
  Name: ${name || 'any'},
  Price: ${price || 'any'},
  Cuisine: ${cuisine || 'any'},
  Dietary Limitations: ${limitation || 'none'},
  Difficulty Level: ${level || 'any'},
please suggest three unique dish recommendations.
Return the result as a valid JSON array in the following format:
[
  {
    "name": string,
    "ingredients": string[],
    "details": string
  },
  ...
]`;
}

export async function callChatGPT(prompt: string, criteria: SearchCriteria): Promise<any[]> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: "system", content: "You are an assistant that suggests dish recommendations." },
        { role: "user", content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });
    
    // Access the generated text directly
    const text = response.choices[0].message?.content;
    if (!text) return [];
    
    let jsonString = text.trim();
    if (jsonString.startsWith('```json')) {
      jsonString = jsonString.replace(/```json/, '').replace(/```/, '').trim();
    }
    
    let dishArray;
    try {
      dishArray = JSON.parse(jsonString);
    } catch (err) {
      console.error('Failed to parse JSON from ChatGPT response:', err);
      return [];
    }
    
    if (!Array.isArray(dishArray)) {
      console.error('Parsed ChatGPT response is not an array.');
      return [];
    }
    
    const dishes = dishArray.map((dishObj: any) => ({
      id: uuidv4(),
      name: dishObj.name || 'Unnamed Dish',
      price: criteria.price || 0,
      cuisine: criteria.cuisine || Cuisine.ITALIAN,
      limitation: criteria.limitation || Limitation.VEGETARIAN,
      level: criteria.level || Level.EASY,
      ingredients: dishObj.ingredients || [],
      details: dishObj.details || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    
    return dishes;
    
  } catch (error) {
    console.error('Error calling ChatGPT:', error);
    return [];
  }
}

export async function handleSearchFlow(criteria: SearchCriteria): Promise<any[]> {
  const existingDishes = await searchInDB(criteria);
  if (existingDishes.length > 0) {
    return existingDishes;
  }
  
  const prompt = buildGPTPrompt(criteria);
  const newDishes = await callChatGPT(prompt, criteria);
  await saveDishes(newDishes);
  return newDishes;
}
