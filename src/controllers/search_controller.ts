import { Request, Response } from 'express';
import { authMiddleware } from '../middleware/verifyToken';
import { SearchCriteria, handleSearchFlow } from '../services/search_service';

export const routerMiddleware = [ authMiddleware ]; // if needed elsewhere

export async function searchDishes(req: Request, res: Response) {
  try {
    const criteria: SearchCriteria = req.body;
    const userId = (req as any).userId;
    console.log('Search criteria received:', criteria);
    const dishes = await handleSearchFlow(criteria, userId);    
    res.status(200).json(dishes);
  } catch (error) {
    console.error('Error during search:', error);
    res.status(500).json({ error: 'Error processing search request.' });
  }
}

export function getSearchOptions(req: Request, res: Response) {
  res.status(200).json({
    cuisines: ["ITALIAN","CHINESE","INDIAN","MEXICAN"],
    limitations:["VEGETARIAN","VEGAN","GLUTEN_FREE"],
    levels:["EASY","MEDIUM","HARD"]
  });
}