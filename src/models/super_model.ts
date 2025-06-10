import mongoose, { ObjectId, Schema } from "mongoose";

export interface ISuperProduct extends Iproduct {
    max_quantity_per_purchase: number;
    createdAt: Date;
}

export interface Iproduct {
    itemId: string;
    name: string;
    unit_info: string;
    price: number;
    image_url: string;
}

export interface Isuper {
    _id?: ObjectId;
    venueId: string;
    name: string;
    slug: string;
    products: ISuperProduct[];
    image_url?: string;
}

const SuperProductSchema = new Schema<ISuperProduct>(
    {
      itemId: { type: String, required: true },
      name: { type: String, required: true },
      unit_info: { type: String, required: true },
      price: { type: Number, required: true },
      image_url: { type: String, required: true },
      max_quantity_per_purchase: { type: Number, required: false },
    },
    { timestamps: true }
);  

const superSchema = new mongoose.Schema<Isuper>({
  name: { type: String, required: true },
  slug: { type: String, required: true },
  products: { type: [SuperProductSchema], default: [] },
}, { versionKey: false });

const Super = mongoose.model<Isuper>('Supers', superSchema);
export default Super;