import { Request, Response } from 'express';
import * as CartService from '../services/cart_service';
import * as ShoppingListService from '../services/shopping_list_service';
import UserService from '../services/user_service';
import { IShoppingList } from '../models/shopping_list_model';

export async function getBestCart(req: Request, res: Response) {
  const userId = req.params.userId;
  const shoppingList: IShoppingList | null = await ShoppingListService.getList(userId)

  const user = await UserService.getUserById(userId)
  if(user?.addresses && user.addresses[0] && shoppingList) {
    const carts = await CartService.findCheapestCart(shoppingList, user?.addresses[0] );
    res.status(200).send(carts);
  }
}