import { OpenAI } from 'openai';
import { IDish } from '../models/dish_model';

const openai = new OpenAI({
  apiKey: process.env.API_KEY || '',
 });

async function callTransform(prompt: string): Promise<Partial<IDish>> {
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'You are an assistant that transforms dishes.' },
      { role: 'user', content: prompt }
    ],
    max_tokens: 800,
    temperature: 0.7,
  });
  let content = response.choices[0].message?.content?.trim() || '';
  if (content.startsWith('```json')) {
    content = content.replace(/```json/, '').replace(/```/, '').trim();
  }
  return JSON.parse(content);
} 

export async function transformToHealthy(dish: IDish): Promise<Partial<IDish>> {
  const minimal = {
    name: dish.name,
    ingredients: dish.ingredients,
    details: dish.details,
    recipe: dish.recipe,
    dishCalories: dish.dishCalories,
    ingredientsCost: dish.ingredientsCost,
    averageDishCost: dish.averageDishCost,
    price: dish.price,
  };
  const prompt = `Make the following dish healthier without changing its identity.  
Return ONLY a valid JSON object with the same fields (name, ingredients, details, recipe, dishCalories, ingredientsCost, averageDishCost, price):  
${JSON.stringify(minimal)}`;
  return await callTransform(prompt);
}

export async function transformToCheap(dish: IDish): Promise<Partial<IDish>> {
  const minimal = {
    name: dish.name,
    ingredients: dish.ingredients,
    details: dish.details,
    recipe: dish.recipe,
    dishCalories: dish.dishCalories,
    ingredientsCost: dish.ingredientsCost,
    averageDishCost: dish.averageDishCost,
    price: dish.price,
  };
  const prompt = `Make the following dish cheaper without changing its identity.  
Return ONLY a valid JSON object with the same fields (name, ingredients, details, recipe, dishCalories, ingredientsCost, averageDishCost, price):  
${JSON.stringify(minimal)}`;
  return await callTransform(prompt);
}
