import { OpenAI } from 'openai';
import { ICart, ICartProduct } from '../models/cart_model';
import { Isuper, ISuperProduct } from '../models/super_model';
import { IAddress } from '../models/user_model';
import axios from 'axios';
import { IShoppingItem, IShoppingList } from '../models/shopping_list_model';
import { convertToBaseUnit } from '../utils/unitNormalizer';

interface Coordinates {
    lat: number;
    lon: number;
  }

const getCoordinates = async (address: IAddress): Promise<Coordinates | null> => {
    try {
      const fullAddress = `${address.street} ${address.building}, ${address.city}`;
      console.log(`ADRESS - https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}`)
      const response = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}`);
      if (response.data.length > 0) {
        return {
          lat: parseFloat(response.data[0].lat),
          lon: parseFloat(response.data[0].lon),
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching coordinates:', error);
      return null;
    }
  };
  
const getNearbyStores = async (lat: number, lon: number): Promise<Isuper[]> => {
    try {
      const response = await axios.get(`https://consumer-api.wolt.com/v1/pages/venue-list/category-grocery?lon=${lon}&lat=${lat}`);
      const stores =  response.data.sections[0].items.map((store: any) => ({
        name: store.title,
        slug: store.venue.slug,
        delivery_price: store.venue.delivery_price_int/100, //TODO relaize how to get price - when not loggd in
      }));
      // TODO - add stores to DB
      return stores;
    } catch (error) {
      console.error('Error fetching nearby stores:', error);
      return [];
    }
  };
  
const searchProductInStore = async (storeSlug: string, productName: string): Promise<ISuperProduct[]> => {
    try {
      const response = await axios.post(
        `https://consumer-api.wolt.com/consumer-api/consumer-assortment/v1/venues/slug/${storeSlug}/assortment/items/search?language=en`,
        { q: productName }
      );
      const products =  response.data.items.map((item: any) => ({
        itemId: item.id,
        name: item.name,
        price: item.price/100,
        unit_info: item.unit_info,
        max_quantity_per_purchase: item.max_quantity_per_purchase
      }));
      // TODO - add products to store in DB - with time updated
      return products.slice(0, 20);
    } catch (error) {
      console.error(`Error searching for product ${productName} in ${storeSlug}:`, error);
      return [];
    }
  };
  
const openai = new OpenAI({
    apiKey: 'put here - dont commit to code',
   });
   
   function buildGPTPrompt(products: ISuperProduct[], query: string): string {
    const options = products.map(product => product.name).join(",\n   ");
    return `I want to make a recipe - I search for a product in the store:
            Product name: ${query},
            Store product options: 
            ${options}
            What products from the options are relevant to my search? Use common sense and narrow the list down.

            IMPORTANT: Return ONLY a valid JSON array in the following format, without any additional text or markdown:
            [
            {
                "name": string
            },
            ...
            ]
            When "name" is the relevant option product name.`;
    }
   
async function callChatGPT(prompt: string): Promise<string[]> {
     try {
       const response = await openai.chat.completions.create({
         model: 'gpt-4o',
         messages: [
           { role: "system", content: "You are an assistant that gets product name for recepie and optianal product and filter relevant product." },
           { role: "user", content: prompt }
         ],
         max_tokens: 1000,
         temperature: 0.7,
       });
       
       const text = response.choices[0].message?.content;
       if (!text) {
         console.error("ChatGPT returned an empty response.");
         return [];
       }
       
       let jsonString = text.trim();
       console.log("Raw ChatGPT response:", jsonString); // Debug log
       
       if (jsonString.startsWith('```json')) {
         jsonString = jsonString.replace(/```json/, '').replace(/```/, '').trim();
       }
       
       let relevantProducts;
       try {
        relevantProducts = JSON.parse(jsonString);
       } catch (err) {
         console.error('Failed to parse JSON from ChatGPT response:', err);
         return [];
       }
       
       if (!Array.isArray(relevantProducts)) {
         console.error('Parsed ChatGPT response is not an array.');
         return [];
       }
       
       return relevantProducts.map(item => item.name);;
       
     } catch (error) {
       console.error('Error calling ChatGPT:', error);
       return [];
     }
   }

const filterRelevantProducts = async (products: ISuperProduct[], query: string): Promise<ISuperProduct[]> => {
    const prompt = buildGPTPrompt(products, query);
    const relevatProductsNames: string[] = await callChatGPT(prompt);

    return products.filter(product => 
        relevatProductsNames.includes(product.name))
  };

const buildCart = async (items: IShoppingItem[], storeSlug: string, shoppingListId: string): Promise<ICart | null> => {
    const cart: ICart= {shoppingListId, products: [], superId: storeSlug, totalCost: 0}; // TODO - chenge superId to super in DB?
    for (const item of items) {
        //TODO - maybe if specific product - try to find alternatives (ex- tomato passata -> tomato paste?)
        const products = await searchProductInStore(storeSlug, item.name);
        
        if(products.length === 0) return null
        
        const relevant = await filterRelevantProducts(products, item.name);

        if (relevant.length === 0) return null;

        // TODO - FIX PRICE COMPARE PRICE VS QUANTITY
        const lowestCostProduct = relevant.reduce((minProduct, product) => 
            product.price < minProduct.price ? product : minProduct
          , relevant[0]);


        // convert base units
        const product_quantity_info = lowestCostProduct.unit_info.split(" ");
        const requiredQuantity = convertToBaseUnit(item.unit, item.quantity);
        const productQuantity = convertToBaseUnit(product_quantity_info[1], Number(product_quantity_info[0]));

        // calc units needed
        let neededUnits = Math.ceil(requiredQuantity / productQuantity);

        const cartProduct: ICartProduct = {
            itemId: lowestCostProduct.itemId,
            quantity: neededUnits,
            price: lowestCostProduct.price * neededUnits
        };

        cart.products.push(cartProduct);
        cart.totalCost += cartProduct.price;
    }

    return cart;
}  

export const findCheapestCart = async (shoppingList: IShoppingList, userAdress: IAddress): Promise<ICart | null> => {
    // TODO - chekc if list with address has been updates since last cart was assembled / ttl hsa passed 

    const coordinates = await getCoordinates(userAdress);
    if(!coordinates) {
        throw "cant find adress";
    }

    const stores: Isuper[] = [(await getNearbyStores(coordinates.lat, coordinates.lon))[0]]; // TODO - remove getting only first
    const storesCarts: ICart[] = [];
    for(const store of stores) {
        const cart = await buildCart(shoppingList.items, store.slug, shoppingList.id);
        if(cart)
            storesCarts.push(cart)
    }

    if(!storesCarts.length)
        return null;
    const lowestCostCart = storesCarts.reduce((minCart, cart) => 
        cart.totalCost < minCart.totalCost ? cart : minCart
      , storesCarts[0]); 
    
    // TODO save cart to db

    return lowestCostCart;
  };  