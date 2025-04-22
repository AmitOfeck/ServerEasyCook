import mongoose, { ObjectId, Schema } from "mongoose";

export interface ISuperProduct {
    itemId: string;
    name: string;
    max_quantity_per_purchase: number;
    unit_info: string;
    price: number;
    createdAt: Date;
}

export interface Isuper {
    _id?: ObjectId;
    name: string;
    slug: string;
    products: ISuperProduct[];
}

const SuperProductSchema = new Schema<ISuperProduct>(
    {
        itemId: { type: String, required: true },
        name: { type: String, required: true },
        max_quantity_per_purchase: { type: Number, required: false },
        unit_info: { type: String, required: true },
        price: { type: Number, required: true },
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