import { DishModel } from '../models/dish_model';
import { ShoppingListModel } from '../models/shopping_list_model';
import { IShoppingItem } from '../models/shopping_list_model';
import { normalizeUnit , convertToBaseUnit } from '../utils/unitNormalizer';

export async function getList(userId: string) {
  return await ShoppingListModel.findOne({ userId });
}

export async function addItem(userId: string, item: IShoppingItem) {
    let shoppingList = await ShoppingListModel.findOne({ userId });
  
    if (!shoppingList) {
      const normalized = normalizeUnit(item.name, item.unit, item.quantity);
      return await ShoppingListModel.create({
        userId,
        items: [normalized]
      });
    }
  
    const matchingItems = shoppingList.items.filter(i => i.name === item.name);
    const totalBase = convertToBaseUnit(item.unit, item.quantity) +
      matchingItems.reduce((sum, i) => sum + convertToBaseUnit(i.unit, i.quantity), 0);
  
    const merged = normalizeUnit(item.name, 'ml', totalBase); // עבור נוזלים
    shoppingList.items = shoppingList.items.filter(i => i.name !== item.name);
    shoppingList.items.push(merged);
  
    await shoppingList.save();
    return shoppingList;
  }

  export async function updateItemQuantity( userId: string, itemName: string, unit: string, delta: number) {
    const shoppingList = await ShoppingListModel.findOne({ userId });
    if (!shoppingList) return null;
  
    const matchingItems = shoppingList.items.filter(i => i.name === itemName);
    if (matchingItems.length === 0) return shoppingList;
  
    const baseUnit = ['ml', 'liter'].includes(unit) ? 'ml' : 'gram';
  
    const totalBase = convertToBaseUnit(unit, delta) +
      matchingItems.reduce((sum, i) => sum + convertToBaseUnit(i.unit, i.quantity), 0);
  
    const normalized = normalizeUnit(itemName, baseUnit, totalBase);
  
    shoppingList.items = shoppingList.items.filter(i => i.name !== itemName);
  
    const existing = shoppingList.items.find(
      i => i.name === normalized.name && i.unit === normalized.unit
    );
  
    if (existing) {
      existing.quantity += normalized.quantity;
    } else {
      shoppingList.items.push(normalized);
    }
  
    mergeSameItems(shoppingList);
  
    await shoppingList.save();
    return shoppingList;
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

  const combinedMap = new Map<string, IShoppingItem>();
  for (const dish of dishes) {
    for (const ingredient of dish.ingredients) {
      const normalized = normalizeUnit(ingredient.name, ingredient.unit, ingredient.quantity);
      const key = `${normalized.name}-${normalized.unit}`;
      if (combinedMap.has(key)) {
        combinedMap.get(key)!.quantity += normalized.quantity;
      } else {
        combinedMap.set(key, { name: normalized.name, unit: normalized.unit, quantity: normalized.quantity });
      }
    }
  }

  const combinedList = Array.from(combinedMap.values());
  let shoppingList = await ShoppingListModel.findOne({ userId });

  if (!shoppingList) {
    return await ShoppingListModel.create({ userId, items: combinedList });
  }

  for (const item of combinedList) {
    const existing = shoppingList.items.find(i => i.name === item.name && i.unit === item.unit);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      shoppingList.items.push(item);
    }
  }

  mergeSameItems(shoppingList);
  await shoppingList.save();
  return shoppingList;
}

function mergeSameItems(shoppingList: { items: IShoppingItem[] }) {
  const mergedMap = new Map<string, number>();

  for (const item of shoppingList.items) {
    const normalized = normalizeUnit(item.name, item.unit, item.quantity);
    const key = `${normalized.name}-${normalized.unit}`;
    if (mergedMap.has(key)) {
      mergedMap.set(key, mergedMap.get(key)! + normalized.quantity);
    } else {
      mergedMap.set(key, normalized.quantity);
    }
  }

  shoppingList.items = Array.from(mergedMap.entries()).map(([key, quantity]) => {
    const [name, unit] = key.split('-');
    return { name, unit, quantity: Math.round(quantity * 1000) / 1000 }; // עיגול עד 3 ספרות
  });
}
