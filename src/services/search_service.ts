import { v4 as uuidv4 } from 'uuid';
import { OpenAI } from 'openai';
import { Cuisine, Limitation, Level, IDish, DishModel } from '../models/dish_model';

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
 apiKey: "",
});

export function buildGPTPrompt(criteria: SearchCriteria): string {
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

export async function callChatGPT(prompt: string, criteria: SearchCriteria): Promise<any[]> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: "system", content: "You are an assistant that suggests dish recommendations." },
        { role: "user", content: prompt }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });
    
    const text = response.choices[0].message?.content;
    if (!text) {
      console.error("ChatGPT returned an empty response.");
      return [];
    }
    
    let jsonString = text.trim();
    console.log("Raw ChatGPT response:", jsonString); // Debug log
    
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
    
    const allowedUnits = ['gram', 'kg', 'ml', 'liter'];
    const dishes = dishArray.map((dishObj: any) => ({
      id: uuidv4(),
      name: dishObj.name || 'Unnamed Dish',
      price: criteria.priceMin || 0,
      cuisine: criteria.cuisine || Cuisine.ITALIAN,
      limitation: criteria.limitation || Limitation.VEGETARIAN,
      level: criteria.level || Level.EASY,
      // Expect dishObj.ingredients to be an array of objects with name and cost and quantity and Unit
      ingredients: (dishObj.ingredients || []).map((ing: any) => {
        let unit = ing.unit || '';
        if (!allowedUnits.includes(unit)) {
          unit = 'gram'; 
        }
        return {
          name: ing.name || '',
          unit,
          quantity: ing.quantity || 0,
          cost: ing.cost || 0
        };
      }),      
      details: dishObj.details || '',
      recipe: dishObj.recipe || '',
      dishCalories: dishObj.dishCalories || 0,
      ingredientsCost: dishObj.ingredientsCost || 0,
      averageDishCost: dishObj.averageDishCost || 0,
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
