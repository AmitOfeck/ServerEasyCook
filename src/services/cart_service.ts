import { ICart, ICartProduct } from '../models/cart_model';
import { IAddress } from '../models/user_model';
import { IShoppingItem, IShoppingList } from '../models/shopping_list_model';
import { convertToBaseUnit } from '../utils/unitNormalizer';
import { getNearbyStores } from '../services/wolt_service';
import { getCoordinates } from '../utils/cordinates';
import { createSuperIfNotExists, getProductsFromCacheOrWolt } from './super_service';

const calculateNeededUnits = (productUnitInfo: string, itemUnit: string, itemQuantity: number): number => {
  const [productQtyStr, productUnit] = productUnitInfo.split(" ");
  const productQty = convertToBaseUnit(productUnit, Number(productQtyStr));
  const requiredQty = convertToBaseUnit(itemUnit, itemQuantity);
  return Math.ceil(requiredQty / productQty);
};

const processItemToCartProduct = async (item: IShoppingItem, storeSlug: string): Promise<ICartProduct | null> => {
  const products = await getProductsFromCacheOrWolt(storeSlug, item.name);
  if (products.length === 0) return null;
  const bestProduct = products.reduce((min, p) => (p.price < min.price ? p : min), products[0]);
  const neededUnits = calculateNeededUnits(bestProduct.unit_info, item.unit, item.quantity);

  return {
    itemId: bestProduct.itemId,
    quantity: neededUnits,
    price: bestProduct.price * neededUnits,
  };
};

const buildCart = async (items: IShoppingItem[], storeSlug: string, shoppingListId: string): Promise<ICart | null> => {
  const cart: ICart = { shoppingListId, products: [], superId: storeSlug, totalCost: 0 };
  const missingProducts: string[] = [];

  const cartProducts = await Promise.all(items.map(async (item) => {
    try {
      const product = await processItemToCartProduct(item, storeSlug);
      if (!product) {
        missingProducts.push(item.name);
        return null;
      }
      return product;
    } catch (error) {
      console.error(`Error processing item '${item.name}':`, error);
      missingProducts.push(item.name);
      return null;
    }
  }));

  const validProducts = cartProducts.filter(Boolean) as ICartProduct[];
  cart.products.push(...validProducts);
  cart.totalCost = validProducts.reduce((total, p) => total + p.price, 0);
  if (missingProducts.length > 0) cart.missingProducts = missingProducts;

  return cart;
};

export const findCheapestCart = async (shoppingList: IShoppingList, userAddress: IAddress): Promise<ICart[] | null> => {
  const coordinates = await getCoordinates(userAddress);
  if (!coordinates) throw "Can't find address";

  const stores = await getNearbyStores(coordinates.lat, coordinates.lon);
  for (const store of stores)
    await createSuperIfNotExists(store.name, store.slug);
  const carts = await Promise.all(
    stores.map(store =>
      buildCart(shoppingList.items, store.slug, shoppingList.id).catch(err => {
        console.error(`Error with store ${store.slug}:`, err);
        return null;
      })
    )
  );

  const validCarts = carts.filter((c): c is ICart => c !== null);
  if (validCarts.length === 0) return null;

  validCarts.sort((a, b) => {
    const missA = a.missingProducts?.length || 0;
    const missB = b.missingProducts?.length || 0;
    return missA !== missB ? missA - missB : a.totalCost - b.totalCost;
  });

  return validCarts.slice(0, 3);
};
