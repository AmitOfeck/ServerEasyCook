import Cart, { ICart, ICartProduct } from '../models/cart_model';
import { IAddress } from '../models/user_model';
import { IShoppingItem, IShoppingList } from '../models/shopping_list_model';
import { convertToBaseUnit } from '../utils/unitNormalizer';
import { getNearbyStores, getStoreDeliveryFee } from '../services/wolt_service';
import { Coordinates, getCoordinates } from '../utils/cordinates';
import { createSuperIfNotExists, getProductsFromCacheOrWolt } from './super_service';
import { Isuper } from '../models/super_model';

const CART_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

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
      name: bestProduct.name,
      unit_info: bestProduct.unit_info,
      image_url: bestProduct.image_url,
    });
  }
  
  return {products:cartProducts, missingProducts};
};

const buildCart = async (items: IShoppingItem[], store: Isuper, shoppingListId: string, userAddress: IAddress, coordinates: Coordinates): Promise<ICart | null> => {
  const cart: ICart = { shoppingListId, products: [], superId: store.slug, superImage: store.image_url, totalCost: 0 , deliveryPrice: 0, address: userAddress };

  const cartProducts = await processItemsToCartProducts(items.map(i => i.name), store.slug);
  cart.deliveryPrice = await getStoreDeliveryFee(store.venueId, coordinates.lat, coordinates.lon);
  cart.totalCost = cartProducts.products.reduce((total, p) => total + p.price, 0) + cart.deliveryPrice;
  cart.products = cartProducts.products;
  if (cartProducts.missingProducts.length > 0) cart.missingProducts = cartProducts.missingProducts;

  return cart;
};

const deleteExpiredCarts = async () => {
  const cutoff = new Date(Date.now() - CART_TTL);

  await Cart.deleteMany({
    createdAt: { $lt: cutoff }
  });
};

const getCachedCarts = async (
  shoppingListId: string,
  shoppingListUpdatTime: Date,
  userAddress: IAddress
): Promise<ICart[] | null> => {

  deleteExpiredCarts();

  // Check if there are any cached carts for the given shopping list and address
  const cachedCarts = await Cart.find({
    shoppingListId,
    address: userAddress,
  });

  if (cachedCarts.length === 0) return null;

  // Filter out carts that are older than the shopping list update time
  const validCarts = cachedCarts.filter(
    cart => cart.createdAt ? cart.createdAt >= shoppingListUpdatTime : false
  );

  return validCarts;
};

const sortCarts = (carts: ICart[]): ICart[] => {
  carts.sort((a, b) => {
    const missA = a.missingProducts?.length || 0;
    const missB = b.missingProducts?.length || 0;
    return missA !== missB ? missA - missB : a.totalCost - b.totalCost;
  });
  return carts;
}

export const findCheapestCart = async (shoppingList: IShoppingList, userAddress: IAddress): Promise<ICart[] | null> => {
  const cachedCarts = await getCachedCarts(shoppingList.id, shoppingList.updatedAt, userAddress);
  if (cachedCarts && cachedCarts.length > 0) return sortCarts(cachedCarts).splice(0, 5);

  const coordinates = await getCoordinates(userAddress);
  if (!coordinates) {
    console.error('Cannot find coordinates for address:', userAddress);
    return [];
  }

  const stores = await getNearbyStores(coordinates.lat, coordinates.lon);
  for (const store of stores)
    await createSuperIfNotExists(store.name, store.slug);
  const carts = await Promise.all(
    stores.map(store =>
      buildCart(shoppingList.items, store, shoppingList.id, userAddress, coordinates).catch(err => {
        console.error(`Error with store ${store.slug}:`, err);
        return null;
      })
    )
  );

  const validCarts = carts.filter((c): c is ICart => c !== null && c.products.length > 0);
  if (validCarts.length === 0) return [];
    
  const cheapestCarts = sortCarts(validCarts).slice(0, 5);

  for(let cart of cheapestCarts) {
    const savedCart = new Cart(cart);
    await savedCart.save();
    cart._id = savedCart._id;
  };

  return cheapestCarts;
};
function func(carts: any, arg1: any) {
  throw new Error('Function not implemented.');
}

