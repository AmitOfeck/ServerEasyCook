import { Request, Response } from 'express';
import * as CartService from '../services/cart_service';
import * as ShoppingListService from '../services/shopping_list_service';
import UserService from '../services/user_service';
import { IShoppingList } from '../models/shopping_list_model';
import { AppError } from '../utils/AppError';

export async function getBestCart(req: Request, res: Response) {    
  try {
    const userId = (req as any).userId
    const shoppingList: IShoppingList | null = await ShoppingListService.getList(userId)

    if(!shoppingList) 
      res.status(400).send({ error: 'User shopping list not found' });

    const user = await UserService.getUserById(userId)
    if(user?.addresses && user.addresses[0] && shoppingList) {
      const carts = await CartService.findCheapestCart(shoppingList, user?.addresses[0] );
      res.status(200).send(carts);
    } else {
      res.status(400).send({ error: 'User has no address' });
    }
  } catch (error) {
    console.error('Error in getBestCart:', error);

    if (error instanceof AppError) {
      res.status(error.statusCode).send({ error: error.message });
    } else {
      res.status(500).send({ error: 'Internal server error' });
    }
  }
}