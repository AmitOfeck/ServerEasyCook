import { DishModel } from '../models/dish_model';
import { ShoppingListModel } from '../models/shopping_list_model';
import { IShoppingItem } from '../models/shopping_list_model';

export async function getList(userId: string) {
  return await ShoppingListModel.findOne({ userId });
}

export async function addItem(userId: string, item: IShoppingItem) {
    let shoppingList = await ShoppingListModel.findOne({ userId });
  
    if (!shoppingList) {
      shoppingList = await ShoppingListModel.create({
        userId,
        items: [item]
      });
    } else {
      const existing = shoppingList.items.find(i => i.name === item.name && i.unit === item.unit);
  
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        shoppingList.items.push(item);
      }
  
      await shoppingList.save();
    }
  
    return shoppingList;
  }

export async function updateItemQuantity(userId: string, itemName: string, delta: number) {
  return await ShoppingListModel.findOneAndUpdate(
    { userId, 'items.name': itemName },
    { $inc: { 'items.$.quantity': delta } },
    { new: true }
  );
}

export async function removeItem(userId: string, itemName: string) {
  return await ShoppingListModel.findOneAndUpdate(
    { userId },
    { $pull: { items: { name: itemName } } },
    { new: true }
  );
}

export async function clearList(userId: string) {
  return await ShoppingListModel.findOneAndUpdate(
    { userId },
    { items: [] },
    { new: true }
  );
}

export async function addCombinedDishesToShoppingList(userId: string, dishIds: string[]) {
  const dishes = await DishModel.find({ _id: { $in: dishIds } });

  const combinedMap = new Map<string, { name: string; unit: string; quantity: number }>();

  for (const dish of dishes) {
    for (const ingredient of dish.ingredients) {
      const key = `${ingredient.name}-${ingredient.unit}`;
      if (combinedMap.has(key)) {
        combinedMap.get(key)!.quantity += ingredient.quantity;
      } else {
        combinedMap.set(key, {
          name: ingredient.name,
          unit: ingredient.unit,
          quantity: ingredient.quantity
        });
      }
    }
  }

  const combinedList = Array.from(combinedMap.values());

  let shoppingList = await ShoppingListModel.findOne({ userId });
  if (!shoppingList) {
    shoppingList = await ShoppingListModel.create({
      userId,
      items: combinedList
    });
  } else {
    for (const item of combinedList) {
      const existing = shoppingList.items.find(i => i.name === item.name && i.unit === item.unit);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        shoppingList.items.push(item);
      }
    }
    await shoppingList.save();
  }

  return shoppingList;
}
