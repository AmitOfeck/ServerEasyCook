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

const processItemsToCartProducts = async (items: string[], storeSlug: string): Promise<{products:ICartProduct[], missingProducts:string[]}> => {
  const products = await getProductsFromCacheOrWolt(storeSlug, items);
  const cartProducts: ICartProduct[] = [];
  const missingProducts: string[] = [];

  for (const product of products) {
    if (product.products.length === 0) {
      missingProducts.push(product.productName);
      continue;
    }
    const bestProduct = product.products.reduce((min, p) => (p.price < min.price ? p : min), product.products[0]);
    const neededUnits = calculateNeededUnits(bestProduct.unit_info, product.productName, 1);
    cartProducts.push({
      itemId: bestProduct.itemId,
      quantity: neededUnits,
      price: bestProduct.price * neededUnits,
    });
  }
  
  return {products:cartProducts, missingProducts};
};

const buildCart = async (items: IShoppingItem[], storeSlug: string, shoppingListId: string): Promise<ICart | null> => {
  const cart: ICart = { shoppingListId, products: [], superId: storeSlug, totalCost: 0 };

  const cartProducts = await processItemsToCartProducts(items.map(i => i.name), storeSlug);

  cart.totalCost = cartProducts.products.reduce((total, p) => total + p.price, 0);
  cart.products = cartProducts.products;
  if (cartProducts.missingProducts.length > 0) cart.missingProducts = cartProducts.missingProducts;

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
