import mongoose, { ObjectId, Schema } from "mongoose";

export interface ISuperProduct {
    itemId: string;
    name: string;
    max_quantity_per_purchase: number;
    unit_info: string;
    price: number;
}

export interface Isuper {
    _id?: ObjectId;
    name: string;
    slug: string;
    products: Isuper[];
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
});

const Super = mongoose.model<Isuper>('Users', superSchema);
export default Super;