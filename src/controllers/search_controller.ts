import { Request, Response } from 'express';
import { handleSearchFlow } from '../services/search_service';

export async function searchDishes(req: Request, res: Response) {
  try {
    const criteria = req.body;
    console.log(criteria, "criteria")
    const dishes = await handleSearchFlow(criteria);
    res.json(dishes);
  } catch (error) {
    console.error('Error during search:', error);
    res.status(500).json({ error: 'Error processing search request.' });
  }
}

export function getSearchOptions(req: Request, res: Response) {
  res.json({
    cuisines: ["ITALIAN", "CHINESE", "INDIAN", "MEXICAN"],  
    limitations: ["VEGETARIAN", "VEGAN", "GLUTEN_FREE"],
    levels: ["EASY", "MEDIUM", "HARD"]
  });
}
