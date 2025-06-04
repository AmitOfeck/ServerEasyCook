import axios from 'axios';
import { Isuper, ISuperProduct } from '../models/super_model';

export const getNearbyStores = async (lat: number, lon: number): Promise<Isuper[]> => {
  try {
    const url = `https://consumer-api.wolt.com/v1/pages/venue-list/category-grocery?lon=${lon}&lat=${lat}`;
    const response = await axios.get(url);
    const stores = response.data.sections[0].items.map((store: any) => ({
      name: store.title,
      slug: store.venue.slug,
      delivery_price: store.venue.delivery_price_int / 100,
      venueId: store.venue.id,
    }));
    return stores.slice(0, 20);
  } catch (error) {
    console.error('Error fetching nearby stores:', error);
    return [];
  }
};

export const getStoreDeliveryFee = async (venueId: string, lat: number, lon: number): Promise<number> => {
  try {
    const url = `https://consumer-api.wolt.com/order-xp/web/v1/pages/venue/pricing-estimates`;
    const body = {
      "purchase_plan":{
        "venue":{
          "id":venueId,
          "country":"ISR",
          "currency":"ILS"
        },
        "delivery_method":"homedelivery",
        "menu_items":[],
        "courier_tip":0,
        "use_promo_discount_ids":[],
        "delivery":{
          "delivery_coordinates":{
            "latitude":lat,
            "longitude":lon
          }
        }
      }
    }
    const response = await axios.post(url,body);
    const delivery_fee = response.data?.delivery_fee?.amount?.amount / 100 || 0; 
    return delivery_fee;
  } catch (error) {
    console.error('Error fetching nearby stores:', error);
    return 0; 
  }
};

export const searchProductInStore = async (storeSlug: string, productName: string): Promise<ISuperProduct[]> => {
  try {
    const url = `https://consumer-api.wolt.com/consumer-api/consumer-assortment/v1/venues/slug/${storeSlug}/assortment/items/search?language=en`;
    const response = await axios.post(url, { q: productName });

    return response.data.items
      .filter((item: any) => 
        item.id && 
        item.name && 
        item.price !== undefined && 
        item.unit_info && 
        item.max_quantity_per_purchase !== undefined
      )
      .map((item: any) => ({
        itemId: item.id,
        name: item.name,
        price: item.price / 100,
        unit_info: item.unit_info,
        max_quantity_per_purchase: item.max_quantity_per_purchase,
        image_url: item.images[0]?.url || '', // Assuming the first image is the main one
      }))
      .slice(0, 20);
  } catch (error) {
    console.error(`Error searching for product ${productName} in ${storeSlug}:`, error);
    return [];
  }
};

