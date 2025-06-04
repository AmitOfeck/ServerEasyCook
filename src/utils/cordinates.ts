import axios from "axios";
import { IAddress } from "../models/user_model";

export interface Coordinates {
    lat: number;
    lon: number;
  }

export const getCoordinates = async (address: IAddress): Promise<Coordinates | null> => {
  try {
    const fullAddress = `${address.street} ${address.building}, ${address.city}`;
    const response = await axios.get<NominatimResult[]>(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}`
    );

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