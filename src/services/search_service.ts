import { v4 as uuidv4 } from 'uuid';
import { OpenAI } from 'openai';
import { Cuisine, Limitation, Level, IDish, DishModel } from '../models/dish_model';
import { buildGenerateRecepiesPrompt, sendPromptToChatGPT } from '../utils/gpt';

export interface SearchCriteria {
  name?: string;
  priceMin?: number;   
  priceMax?: number;
  cuisine?: Cuisine;
  limitation?: Limitation;
  level?: Level;
  numberOfDishes?: number;
}

export async function searchInDB(criteria: SearchCriteria): Promise<IDish[]> {
  const query: any = {};
  if (criteria.name) {
    query.name = { $regex: criteria.name, $options: 'i' };
  }
  // PRICE RANGE
  if (criteria.priceMin !== undefined && criteria.priceMax !== undefined) {
    query.price = { $gte: criteria.priceMin, $lte: criteria.priceMax };
  } else if (criteria.priceMin !== undefined) {
    query.price = { $gte: criteria.priceMin };
  } else if (criteria.priceMax !== undefined) {
    query.price = { $lte: criteria.priceMax };
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

const openai = new OpenAI({
  apiKey: process.env.API_KEY || '',
});

async function callChatGenerateDishes(prompt: string, criteria: SearchCriteria): Promise<any[]> {
  try {
    const rawJson = await sendPromptToChatGPT(prompt, "You are an assistant that suggests dish recommendations.");
    
    const parsed = JSON.parse(rawJson);
    if (!Array.isArray(parsed)) {
      console.error('Parsed ChatGPT response is not an array.');
      return [];
    }

    const allowedUnits = ['gram', 'kg', 'ml', 'liter'];
    return parsed.map((dishObj: any) => ({
      id: uuidv4(),
      name: dishObj.name || 'Unnamed Dish',
      price: criteria.priceMin || 0,
      cuisine: criteria.cuisine || Cuisine.ITALIAN,
      limitation: criteria.limitation || Limitation.VEGETARIAN,
      level: criteria.level || Level.EASY,
      ingredients: (dishObj.ingredients || []).map((ing: any) => ({
        name: ing.name || '',
        unit: allowedUnits.includes(ing.unit) ? ing.unit : 'gram',
        quantity: ing.quantity || 0,
        cost: ing.cost || 0
      })),
      details: dishObj.details || '',
      recipe: dishObj.recipe || '',
      dishCalories: dishObj.dishCalories || 0,
      ingredientsCost: dishObj.ingredientsCost || 0,
      averageDishCost: dishObj.averageDishCost || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  } catch (error) {
    console.error('Error generating dishes:', error);
    return [];
  }
}

export async function handleSearchFlow(criteria: SearchCriteria): Promise<any[]> {
  const existingDishes = await searchInDB(criteria);
  if (existingDishes.length > 0) {
    return existingDishes;
  }
  
  const prompt = buildGenerateRecepiesPrompt(criteria);
  const newDishes = await callChatGenerateDishes(prompt, criteria);
  await saveDishes(newDishes);
  return newDishes;
}
