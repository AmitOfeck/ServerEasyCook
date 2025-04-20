import e from 'express';
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
        items: [normalized],
        preparedDishes: new Map<string, number>()
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

  export async function updateItemQuantity(userId: string, itemName: string, unit: string, delta: number) {
    const shoppingList = await ShoppingListModel.findOne({ userId });
    if (!shoppingList) return null;
  
    const matchingItems = shoppingList.items.filter(i => i.name === itemName);
    if (matchingItems.length === 0) return shoppingList;
  
    const baseUnit = ['ml', 'liter'].includes(unit) ? 'ml' : 'gram';
  
    const totalBase = convertToBaseUnit(unit, delta) +
      matchingItems.reduce((sum, i) => sum + convertToBaseUnit(i.unit, i.quantity), 0);
  
    const normalized = normalizeUnit(itemName, baseUnit, totalBase);
  
    const index = shoppingList.items.findIndex(i => i.name === itemName);
  
    if (index !== -1) {
      shoppingList.items[index] = normalized; 
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
    { items: [], preparedDishes: {} },
    { new: true }
  );
}

export async function addCombinedDishesToShoppingList(userId: string, dishIds: string[]) {
  const dishes = await DishModel.find({ _id: { $in: dishIds } });

  const combinedMap = new Map<string, number>(); // name -> baseQuantity

  for (const dish of dishes) {
    for (const ingredient of dish.ingredients) {
      const baseQuantity = convertToBaseUnit(ingredient.unit, ingredient.quantity);
      const key = ingredient.name; // merge by name
      if (combinedMap.has(key)) {
        combinedMap.set(key, combinedMap.get(key)! + baseQuantity);
      } else {
        combinedMap.set(key, baseQuantity);
      }
    }
  }

  let shoppingList = await ShoppingListModel.findOne({ userId });

  if (!shoppingList) {
    shoppingList = await ShoppingListModel.create({
      userId,
      items: [],
      preparedDishes: new Map<string, number>()
    });
  }

  for (const [name, baseQuantity] of combinedMap.entries()) {
    const existing = shoppingList.items.find(item => item.name === name);

    if (existing) {
      const existingBase = convertToBaseUnit(existing.unit, existing.quantity);
      const totalBase = existingBase + baseQuantity;
      // normlize
      const normalized = normalizeUnit(name, 'gram', totalBase);
      if (normalized.unit === 'gram' || normalized.unit === 'kg') {
        existing.unit = normalized.unit;
        existing.quantity = normalized.quantity;
      } else {
        const normalizedLiquid = normalizeUnit(name, 'ml', totalBase);
        existing.unit = normalizedLiquid.unit;
        existing.quantity = normalizedLiquid.quantity;
      }
    } else {
      // new product
      let normalized = normalizeUnit(name, 'gram', baseQuantity);
      if (normalized.unit !== 'gram' && normalized.unit !== 'kg') {
        normalized = normalizeUnit(name, 'ml', baseQuantity);
      }
      shoppingList.items.push(normalized);
    }
  }

  // update preparedDishes
  if (!shoppingList.preparedDishes) {
    shoppingList.preparedDishes = new Map<string, number>();
  }

  for (const dish of dishes) {
    const dishIdStr = (dish._id as any).toString();
    const currentCount = shoppingList.preparedDishes.get(dishIdStr) || 0;
    shoppingList.preparedDishes.set(dishIdStr, currentCount + 1);
  }

  await shoppingList.save();
  return shoppingList;
}



export function mergeSameItems(shoppingList: { items: IShoppingItem[] }) {
  const mergedMap = new Map<string, number>();

  for (const item of shoppingList.items) {
    const baseQuantity = convertToBaseUnit(item.unit, item.quantity); // תמיד מעביר לגרם או מיליליטר
    const key = item.name; // לפי שם בלבד

    if (mergedMap.has(key)) {
      mergedMap.set(key, mergedMap.get(key)! + baseQuantity);
    } else {
      mergedMap.set(key, baseQuantity);
    }
  }

  shoppingList.items = Array.from(mergedMap.entries()).map(([name, baseQuantity]) => {
    // נורמל חזרה לפי שם וכמות בבסיס
    const normalized = normalizeUnit(name, 'gram', baseQuantity); // נתחיל מ־gram
    if (normalized.unit === 'gram' || normalized.unit === 'kg') {
      return normalized;
    } else {
      // אם זה לא גרם/ק"ג – ננרמל ל־ml/liter
      const normalizedLiquid = normalizeUnit(name, 'ml', baseQuantity);
      return normalizedLiquid;
    }
  });
}


export async function replaceItem(userId: string, item: IShoppingItem) {
  const shoppingList = await ShoppingListModel.findOne({ userId });
  const normalized = normalizeUnit(item.name, item.unit, item.quantity);

  if (!shoppingList) {
    return await ShoppingListModel.create({ userId, items: [normalized] });
  }

  const index = shoppingList.items.findIndex(i => i.name === item.name);

  if (index !== -1) {
    shoppingList.items[index] = normalized; 
  } else {
    shoppingList.items.push(normalized);
  }

  mergeSameItems(shoppingList);
  await shoppingList.save();
  return shoppingList;
}


export async function removeDishFromShoppingList(userId: string, dishId: string) {
  const shoppingList = await ShoppingListModel.findOne({ userId });
  if (!shoppingList) {
    throw new Error('Shopping list not found');
  }

  const dish = await DishModel.findById(dishId);
  if (!dish) {
    throw new Error('Dish not found');
  }

  if (!shoppingList.preparedDishes || !shoppingList.preparedDishes.has(dishId)) {
    throw new Error('Dish not found in prepared dishes');
  }

  for (const ingredient of dish.ingredients) {
    const ingredientBaseQty = convertToBaseUnit(ingredient.unit, ingredient.quantity);

    const itemIndex = shoppingList.items.findIndex(item => item.name === ingredient.name);
    if (itemIndex === -1) {
      continue; // אין מה להחסיר אם המרכיב לא קיים
    }

    const existingItem = shoppingList.items[itemIndex];
    const existingBaseQty = convertToBaseUnit(existingItem.unit, existingItem.quantity);

    const updatedBaseQty = existingBaseQty - ingredientBaseQty;

    if (updatedBaseQty <= 0) {
      shoppingList.items.splice(itemIndex, 1); // מוחק את המוצר
    } else {
      const isLiquid = existingItem.unit === 'ml' || existingItem.unit === 'liter';
      const baseUnit = isLiquid ? 'ml' : 'gram';
      const normalized = normalizeUnit(existingItem.name, baseUnit, updatedBaseQty);
      shoppingList.items[itemIndex] = normalized;
    }
  }

  // עדכון preparedDishes
  const currentCount = shoppingList.preparedDishes.get(dishId) || 0;
  if (currentCount <= 1) {
    shoppingList.preparedDishes.delete(dishId);
  } else {
    shoppingList.preparedDishes.set(dishId, currentCount - 1);
  }

  await shoppingList.save();
  return shoppingList;
}

