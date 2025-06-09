import mongoose, { ObjectId, Schema } from "mongoose";
import { addressSchema, IAddress } from "./user_model";
import { Iproduct } from "./super_model";

export interface ICartProduct extends Iproduct {
    quantity: number;
}

export interface ICart {
    _id?: ObjectId;
    shoppingListId: string;
    products: ICartProduct[];
    superId: string;
    missingProducts?: string[];
    totalCost: number;
    deliveryPrice: number; 
    address: IAddress; 
    createdAt?: Date;
    updatedAt?: Date;
}

export const CartProductSchema = new Schema<ICartProduct>(
  {
    itemId: { type: String, required: true },
    name: { type: String, required: true },
    unit_info: { type: String, required: true },
    image_url: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

  

const cartSchema = new mongoose.Schema<ICart>({
  shoppingListId: { type: String, required: true },
  products: { type: [CartProductSchema], default: [] },
  missingProducts: { type: [String], default: [] },
  superId: { type: String, required: true },
  totalCost: { type: Number, required: true },
  address: { type: addressSchema, required: true },
}, { timestamps: true });

const Cart = mongoose.model<ICart>('Cart', cartSchema);
export default Cart;