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
    }));
    return stores.slice(0, 20);
  } catch (error) {
    console.error('Error fetching nearby stores:', error);
    return [];
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
      }))
      .slice(0, 20);
  } catch (error) {
    console.error(`Error searching for product ${productName} in ${storeSlug}:`, error);
    return [];
  }
};

