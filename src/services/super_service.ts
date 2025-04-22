import Super from "../models/super_model";
import { ISuperProduct } from "../models/super_model";
import { buildGetRelevantProductsGPTPrompt, sendPromptToChatGPT } from "../utils/gpt";
import { searchProductInStore } from "./wolt_service";

const isProductFresh = (createdAt: Date): boolean => {
  const now = new Date();
  const productTime = new Date(createdAt);
  const diffHours = (now.getTime() - productTime.getTime()) / (1000 * 60 * 60);
  return diffHours < 24;
};

const callChatGetRelevantProducts = async (prompt: string): Promise<string[]> => {
  try {
    const rawJson = await sendPromptToChatGPT(prompt, "You are an assistant that filters product names for recipes.");
    const parsed = JSON.parse(rawJson);
    return Array.isArray(parsed) ? parsed.map(p => p.name) : [];
  } catch (error) {
    console.error("Error extracting product names:", error);
    return [];
  }
};

const filterRelevantProducts = async (products: ISuperProduct[], query: string): Promise<ISuperProduct[]> => {
  const prompt = buildGetRelevantProductsGPTPrompt(products, query);
  const relevantNames = await callChatGetRelevantProducts(prompt);
  return products.filter(product => relevantNames.includes(product.name));
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

export const getProductsFromCacheOrWolt = async (storeSlug: string, productName: string): Promise<ISuperProduct[]> => {
  try {
    const superDoc = await Super.findOne({ slug: storeSlug });
    const now = new Date();

    let freshProducts: ISuperProduct[] = [];

    if (superDoc && superDoc.products.length > 0) {
      const validProducts = superDoc.products.filter(p => isProductFresh(p.createdAt));

      if (validProducts.length !== superDoc.products.length) {
        superDoc.products = validProducts;
        await superDoc.save();
        console.log("♻️ Removed expired products from DB");
      }

      freshProducts = await filterRelevantProducts(validProducts, productName);
      if (freshProducts.length > 0) {
        console.log("🔁 Using fresh cached products");
        return freshProducts;
      }
    }

    // Fetch from Wolt API if no fresh products
    const products = await searchProductInStore(storeSlug, productName);

    const newProducts: ISuperProduct[] = products.map((item: any) => ({
      itemId: item.itemId,
      name: item.name,
      price: item.price / 100,
      unit_info: item.unit_info,
      max_quantity_per_purchase: item.max_quantity_per_purchase,
      createdAt: now,
    }));

    if (superDoc) {
      await updateSuperWithNewProducts(superDoc, newProducts);
    } else {
      console.log("📦 Wolt products fetched, but super not found in DB");
    }

    const relevant = await filterRelevantProducts(newProducts, productName);
    return relevant;
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
