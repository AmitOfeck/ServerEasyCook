import { v4 as uuidv4 } from 'uuid';
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
  if (criteria.name) query.name = { $regex: criteria.name, $options: 'i' };
  if (criteria.priceMin !== undefined && criteria.priceMax !== undefined) {
    query.price = { $gte: criteria.priceMin, $lte: criteria.priceMax };
  } else if (criteria.priceMin !== undefined) {
    query.price = { $gte: criteria.priceMin };
  } else if (criteria.priceMax !== undefined) {
    query.price = { $lte: criteria.priceMax };
  }
  if (criteria.cuisine) query.cuisine = criteria.cuisine;
  if (criteria.limitation) query.limitation = criteria.limitation;
  if (criteria.level) query.level = criteria.level;
  return DishModel.find(query).exec();
}

async function callChatGenerateDishes(prompt: string, criteria: SearchCriteria): Promise<Partial<IDish>[]> {
  try {
    const rawJson = await sendPromptToChatGPT(prompt, 'You are an assistant that suggests dish recommendations.');
    let jsonStr = rawJson.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/```json\s*/, '').replace(/```$/, '').trim();
    }
    const start = jsonStr.indexOf('[');
    const end = jsonStr.lastIndexOf(']');
    if (start !== -1 && end !== -1) {
      jsonStr = jsonStr.substring(start, end + 1);
    }
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return [];
    const allowedUnits = ['gram', 'kg', 'ml', 'liter'];
    return parsed.map((dishObj: any) => ({
      id: uuidv4(),
      name: dishObj.name || 'Unnamed Dish',
      price: criteria.priceMin || 0,
      cuisine: criteria.cuisine || Cuisine.NONE,
      limitation: criteria.limitation || Limitation.NONE,
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

export async function handleSearchFlow(criteria: SearchCriteria, userId: string): Promise<IDish[]> {
  const existing = await searchInDB(criteria);
  if (existing.length > 0) return existing;
  const prompt = buildGenerateRecepiesPrompt(criteria);
  const generated = await callChatGenerateDishes(prompt, criteria);
  const docsToSave = generated.map(d => ({ ...d, createdBy: userId }));
  const insertedDocs = await DishModel.insertMany(docsToSave);
  return insertedDocs as unknown as IDish[];
}
