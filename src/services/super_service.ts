import Super from "../models/super_model";
import { ISuperProduct } from "../models/super_model";
import { buildGetBulkRelevantProductsCacheGPTPrompt, buildGetBulkRelevantProductsWoltGPTPrompt, sendPromptToChatGPT } from "../utils/gpt";
import { searchProductInStore } from "./wolt_service";
import Bottleneck from 'bottleneck';

export const limiter = new Bottleneck({
  maxConcurrent: 10,
  minTime: 200, // minimum time between each request
});

export interface IrelevantProducts {
    productName: string;
    products: ISuperProduct[];
}

const isProductFresh = (createdAt: Date): boolean => {
  const now = new Date();
  const productTime = new Date(createdAt);
  const diffHours = (now.getTime() - productTime.getTime()) / (1000 * 60 * 60);
  return diffHours < 24;
};

const callChatGetRelevantProducts = async (prompt: string): Promise<{ productName: string, relevantProducts: string[] }[]> => {
  try {
    const rawJson = await sendPromptToChatGPT(prompt, "You are an assistant that filters product names for recipes.");
    const parsed = JSON.parse(rawJson);
    return parsed;
  } catch (error) {
    console.error("Error extracting product names:", error);
    return [];
  }
};

const filterBulkRelevantProductsWolt = async (products: ISuperProduct[][], queries: string[]): Promise<IrelevantProducts[]> => {
  const prompt = buildGetBulkRelevantProductsWoltGPTPrompt(products, queries);
  const relevantProducts = await callChatGetRelevantProducts(prompt);

  // Now, filter each list of products based on the relevant names
  return products.map((productList, index) => {
    const queryName = queries[index];
    const relevantNames = relevantProducts.find(rp => rp.productName === queryName)?.relevantProducts || [];

    const filteredProducts = productList.filter(product => relevantNames.includes(product.name));

    return {
      productName: queryName,
      products: filteredProducts
    };
  });
};

const filterBulkRelevantProductsCache = async (products: ISuperProduct[], queries: string[]): Promise<IrelevantProducts[]> => {
  const prompt = buildGetBulkRelevantProductsCacheGPTPrompt(products, queries);
  const relevantProducts = await callChatGetRelevantProducts(prompt);

  // Now, filter each list of products based on the relevant names
  return queries.map((query, index) => {
    const relevantNames = relevantProducts.find(rp => rp.productName === query)?.relevantProducts || [];
    const filteredProducts = products.filter(product => relevantNames.includes(product.name));

    return {
      productName: query,
      products: filteredProducts
    };
  });
};

const updateSuperWithNewProducts = async (superDoc: any, newProducts: ISuperProduct[]): Promise<void> => {
  const existingProducts =superDoc.products;

  newProducts.forEach(newProduct => {
    if (!existingProducts.some((product: ISuperProduct) => product.itemId === newProduct.itemId)) {
      existingProducts.push(newProduct);
    }
  });

  superDoc.products = existingProducts;
  try{
    await superDoc.save();
    console.log("📝 Updated super with new products");
  }
  catch (error) {
    console.error("Error saving super document:", error);
  }
};

export const getProductsFromCacheOrWolt = async (storeSlug: string, productNames: string[]): Promise<IrelevantProducts[]> => {
  try {
    const superDoc = await Super.findOne({ slug: storeSlug });
    const now = new Date();

    let cacheRelevantProducts: IrelevantProducts[] = [];

    if (superDoc && superDoc.products.length > 0) {
      const validProducts = superDoc.products.filter(p => isProductFresh(p.createdAt));

      // Remove expired products from DB if any
      if (validProducts.length !== superDoc.products.length) {
        superDoc.products = validProducts;
        await superDoc.save();
        console.log("♻️ Removed expired products from DB");
      }

      // Filter the relevant products from cache
      cacheRelevantProducts = await filterBulkRelevantProductsCache(validProducts, productNames);

      // If we found relevant fresh products in cache, return them
      if (cacheRelevantProducts.length > 0) {
        console.log("🔁 Using fresh cached products - ", cacheRelevantProducts.map(p => p.productName)); 
      }
    }

    // Identify missing products by comparing the product names from cache
    const missingProducts = productNames.filter(pName => 
      !cacheRelevantProducts.some((p: IrelevantProducts) => p.productName === pName)
    );

    if (missingProducts.length > 0) {
      console.log(`🔍 Missing products in cache, fetching from Wolt: ${missingProducts.join(", ")}`);
      
      // Use the bulk function to get relevant products from Wolt for missing products
      const productPromises = missingProducts.map(productName =>
        limiter.schedule(() => searchProductInStore(storeSlug, productName))
      );

      // Wait for all product search promises to resolve
      const productLists = await Promise.all(productPromises);

      const newProducts: ISuperProduct[][] = productLists.map((productList: any[]) =>
        productList.map((item: any) => ({
          itemId: item.itemId,
          name: item.name,
          price: item.price,
          unit_info: item.unit_info,
          max_quantity_per_purchase: item.max_quantity_per_purchase,
          createdAt: now,
        }))
      );
      

      if (superDoc) {
        // Update Super with new products from Wolt
        updateSuperWithNewProducts(superDoc, newProducts.flat());
      } else {
        console.log("📦 Wolt products fetched, but super not found in DB");
      }

      // Filter the relevant new products fetched from Wolt
      const woltRelevantNewProducts = await filterBulkRelevantProductsWolt(newProducts, missingProducts);
    
      return woltRelevantNewProducts.concat(cacheRelevantProducts);
    }
    else {
      return cacheRelevantProducts; 
    }

    return []; // Return an empty array if no products are found
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

    const newSuper = new Super({
      name,
      slug,
      products: [],
    });

    await newSuper.save();
    console.log(`🆕 Created new super: '${name}'`);
    return newSuper;
  } catch (err) {
    console.error("❌ Failed to create super:", err);
    throw err;
  }
};
