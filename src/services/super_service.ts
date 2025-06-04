import Super from "../models/super_model";
import { ISuperProduct } from "../models/super_model";
import {
  buildGetBulkRelevantProductsCacheGPTPrompt,
  buildGetBulkRelevantProductsWoltGPTPrompt,
  sendPromptToChatGPT,
} from "../utils/gpt";
import { searchProductInStore } from "./wolt_service";
import Bottleneck from "bottleneck";

export const limiter = new Bottleneck({
  maxConcurrent: Number(process.env.MAX_CONCURRENT_REQUESTS) || 5,
  minTime: Number(process.env.MIN_TIME_BETWEEN_REQUESTS_MS) || 200,
});

export interface IRelevantProducts {
  productName: string;
  products: ISuperProduct[];
}

const isProductFresh = (createdAt: Date): boolean => {
  const now = new Date();
  const diffHours = (now.getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  return diffHours < 24;
};

const callChatGetRelevantProducts = async (prompt: string) => {
  try {
    const rawJson = await sendPromptToChatGPT(prompt, "You are an assistant that filters product names for recipes.");
    return JSON.parse(rawJson) as { productName: string; relevantProducts: string[] }[];
  } catch (error) {
    console.error("Error extracting product names:", error);
    return [];
  }
};

const filterProducts = (productList: ISuperProduct[], relevantNames: string[]): ISuperProduct[] => {
  return productList.filter(product => relevantNames.includes(product.name));
};

const filterBulkRelevantProductsCache = async (products: ISuperProduct[], queries: string[]): Promise<IRelevantProducts[]> => {
  const prompt = buildGetBulkRelevantProductsCacheGPTPrompt(products, queries);
  const relevantProducts = await callChatGetRelevantProducts(prompt);
  
  return queries.map(query => {
    const relevantNames = relevantProducts.find(rp => rp.productName === query)?.relevantProducts || [];
    return { productName: query, products: filterProducts(products, relevantNames) };
  });
};

const filterBulkRelevantProductsWolt = async (products: ISuperProduct[][], queries: string[]): Promise<IRelevantProducts[]> => {
  const prompt = buildGetBulkRelevantProductsWoltGPTPrompt(products, queries);
  const relevantProducts = await callChatGetRelevantProducts(prompt);

  return products.map((productList, index) => {
    const relevantNames = relevantProducts.find(rp => rp.productName === queries[index])?.relevantProducts || [];
    return { productName: queries[index], products: filterProducts(productList, relevantNames) };
  });
};

const updateSuperWithNewProducts = async (superDoc: any, newProducts: ISuperProduct[]) => {
  try {
    const existingProducts = superDoc.products || [];
    const uniqueProducts = newProducts.filter(newProduct =>
      !existingProducts.some((p: ISuperProduct) => p.itemId === newProduct.itemId)
    );

    if (uniqueProducts.length > 0) {
      superDoc.products.push(...uniqueProducts);
      await superDoc.save();
      console.log("📝 Updated super with new products");
    }
  } catch (error) {
    console.error("Error saving super document:", error);
  }
};

const removeExpiredProducts = async (superDoc: any): Promise<ISuperProduct[]> => {
  const validProducts = superDoc.products.filter((p: ISuperProduct) => isProductFresh(p.createdAt));
  if (validProducts.length !== superDoc.products.length) {
    superDoc.products = validProducts;
    await superDoc.save();
    console.log("♻️ Removed expired products from DB");
  }
  return validProducts;
};

export const getProductsFromCacheOrWolt = async (storeSlug: string, productNames: string[]): Promise<IRelevantProducts[]> => {
  try {
    const superDoc = await Super.findOne({ slug: storeSlug });
    const now = new Date();
    let cacheRelevantProducts: IRelevantProducts[] = [];

    if (superDoc && superDoc.products.length > 0) {
      const validProducts = await removeExpiredProducts(superDoc);
      cacheRelevantProducts = await filterBulkRelevantProductsCache(validProducts, productNames);
      cacheRelevantProducts = cacheRelevantProducts.filter(rp => rp.products.length > 0); // Remove empty results

      if (cacheRelevantProducts.length > 0) {
        console.log("🔁 Using fresh cached products:", cacheRelevantProducts.map(p => p.productName));
      }
    }

    const missingProducts = productNames.filter(
      name => !cacheRelevantProducts.some(p => p.productName === name)
    );

    if (missingProducts.length > 0) {
      console.log(`🔍 Missing products in cache, fetching from Wolt: ${missingProducts.join(", ")}`);

      const productLists = await Promise.all(
        missingProducts.map(name => limiter.schedule(() => searchProductInStore(storeSlug, name)))
      );

      const newProducts = productLists.map(list => 
        list.map(item => ({
          itemId: item.itemId,
          name: item.name,
          price: item.price,
          unit_info: item.unit_info,
          max_quantity_per_purchase: item.max_quantity_per_purchase,
          image_url: item.image_url,
          createdAt: now,
        }))
      );

      if (superDoc) {
        await updateSuperWithNewProducts(superDoc, newProducts.flat());
      } else {
        console.log("📦 Wolt products fetched, but super not found in DB");
      }

      const woltRelevantNewProducts = await filterBulkRelevantProductsWolt(newProducts, missingProducts);
      return [...woltRelevantNewProducts, ...cacheRelevantProducts];
    }

    return cacheRelevantProducts;
  } catch (error) {
    console.error("❌ Failed to fetch products:", error);
    return [];
  }
};

export const createSuperIfNotExists = async (name: string, slug: string) => {
  try {
    const existing = await Super.findOne({ slug });
    if (existing) {
      console.log(`✅ Super '${name}' already exists`);
      return existing;
    }

    const newSuper = new Super({ name, slug, products: [] });
    await newSuper.save();
    console.log(`🆕 Created new super: '${name}'`);
    return newSuper;
  } catch (error) {
    console.error("❌ Failed to create super:", error);
    throw error;
  }
};
