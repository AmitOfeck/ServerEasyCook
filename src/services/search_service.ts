import { v4 as uuidv4 } from 'uuid';
import { Cuisine, Limitation, Level, IDish, DishModel } from '../models/dish_model';
import { buildGenerateRecepiesPrompt, sendPromptToChatGPT } from '../utils/gpt';
import { getFridge } from './fridge_service'; 
import { IFridgeItem } from '../models/fridge_model'; 
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.API_KEY || '',
 });

export interface SearchCriteria {
  name?: string;
  priceMin?: number;
  priceMax?: number;
  cuisine?: Cuisine;
  limitation?: Limitation;
  level?: Level;
  numberOfDishes?: number;
  prompt?: string;
  useFridge?: boolean;
}

export async function insertDishImage(d: any) {
  const imagePrompt = `A delicious and beautifully plated dish called ${d.name}, high-resolution, professional food photography`;
  try {
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: imagePrompt,
      size: "1024x1024",
    });
    d.imageUrl = imageResponse.data?.[0]?.url ?? '';
  } catch (err: any) {
    console.error('Failed to generate dish image:', err?.response?.data || err.message || err);
    d.imageUrl = '';
  }
  return d;
}

export async function searchInDB(criteria: SearchCriteria): Promise<IDish[]> {
  const query: any = {};
  
    // Handle other filters
  if (!criteria.useFridge && criteria.prompt===undefined) {  
  if (criteria.priceMin !== undefined && criteria.priceMax !== undefined) {
    query.price = { $gte: criteria.priceMin, $lte: criteria.priceMax };
  } else if (criteria.priceMin !== undefined) {
    query.price = { $gte: criteria.priceMin };
  } else if (criteria.priceMax !== undefined) {
    query.price = { $lte: criteria.priceMax };
  }
  if (criteria.name) query.name = criteria.name;
  if (criteria.cuisine) query.cuisine = criteria.cuisine;
  if (criteria.limitation) query.limitation = criteria.limitation;
  if (criteria.level) query.level = criteria.level;
}
if (query.length === undefined) {
   return [];
  } 
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
    const dishes: Partial<IDish>[] = parsed.map((dishObj: any) => ({
      id: uuidv4(),
      name: dishObj.name || 'Unnamed Dish',
      price: dishObj.price || 0,
      cuisine: (criteria.cuisine && criteria.cuisine !== Cuisine.NONE) 
        ? criteria.cuisine 
        : (dishObj.cuisine || Cuisine.NONE),
      limitation: (criteria.limitation && criteria.limitation !== Limitation.NONE) 
        ? criteria.limitation 
        : (dishObj.limitation || Limitation.NONE),
      level: criteria.level || dishObj.level|| Level.EASY,
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
      imageUrl: "",
    }));

    const stepGenerateDishPicStart = performance.now();
        const dishesWithImages = await Promise.all(
      dishes.map((dish) => insertDishImage(dish))
    );

    return dishesWithImages;

  } catch (error) {
    console.error('Error generating dishes:', error);
    return [];
  }
}

export async function handleSearchFlow(criteria: SearchCriteria, userId: string): Promise<IDish[]> {
  // First, try to find existing dishes in the database
  const existing = await searchInDB(criteria);
  
  if (existing.length > 0 ) {
    return existing;
  }
  
  
  // No existing dishes found, generate new ones using AI
  console.log('No existing dishes found, generating new dishes with AI...');

  let fridgeItems: IFridgeItem[] = [];
  if (criteria.useFridge) {
    try {
      console.log('Fetching fridge items for user:', userId);
      const fridge = await getFridge(userId);
      fridgeItems = fridge.items || [];
      console.log(`Found ${fridgeItems.length} items in fridge:`, fridgeItems);
    } catch (error) {
      console.error('Error fetching fridge items:', error);
    }
  }

  const prompt = buildGenerateRecepiesPrompt(criteria, fridgeItems);
  const generated = await callChatGenerateDishes(prompt, criteria);
  
  if (generated.length === 0) {
    console.log('Failed to generate dishes with AI');
    return [];
  }
  
  const docsToSave = generated.map(d => ({ ...d, createdBy: userId }));
  const insertedDocs = await DishModel.insertMany(docsToSave);
  console.log(`Generated and saved ${insertedDocs.length} new dishes`);
  
  return insertedDocs as unknown as IDish[];
}
