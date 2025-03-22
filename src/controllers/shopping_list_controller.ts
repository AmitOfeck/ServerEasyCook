import { Request, Response } from 'express';
import * as ShoppingListService from '../services/shopping_list_service';

export async function getList(req: Request, res: Response) {
  const userId = (req as any).userId;
  const list = await ShoppingListService.getList(userId);
  res.send(list || []);
}

export async function addItem(req: Request, res: Response) {
  const userId = (req as any).userId;
  const item = req.body;
  const updated = await ShoppingListService.addItem(userId, item);
  res.send(updated);
}

export async function updateItemQuantity(req: Request, res: Response) {
  const userId = (req as any).userId;
  const { itemName, delta } = req.body;
  const updated = await ShoppingListService.updateItemQuantity(userId, itemName, delta);
  res.send(updated);
}

export async function removeItem(req: Request, res: Response) {
  const userId = (req as any).userId;
  const { itemName } = req.body;
  const updated = await ShoppingListService.removeItem(userId, itemName);
  res.send(updated);
}

export async function clearList(req: Request, res: Response) {
  const userId = (req as any).userId;
  const updated = await ShoppingListService.clearList(userId);
  res.send(updated);
}

export async function addCombinedDishesToList(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { dishIds } = req.body;

      //console.log("userId:", userId);
      //console.log("dishIds:", dishIds);
  
      if (!userId || !Array.isArray(dishIds) || dishIds.length === 0) {
        console.log("🔴 Validation failed - missing userId or dishIds");
        res.status(400).send({ error: "userId and dishIds[] are required" });
        return;
      }
  
      const updatedList = await ShoppingListService.addCombinedDishesToShoppingList(userId, dishIds);
      //console.log("Shopping list updated for user:", userId);
      res.status(200).send(updatedList);
    } catch (err: any) {
      console.error("🔥 Error in addCombinedDishesToList:", err);
      res.status(500).send({ error: err.message });
    }
  }
