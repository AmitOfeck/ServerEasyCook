import mongoose, { ObjectId, Schema } from "mongoose";
import { addressSchema, IAddress } from "./user_model";

export interface ICartProduct {
    itemId: string;
    quantity: number;
    price: number;
}

export interface ICart {
    _id?: ObjectId;
    shoppingListId: string;
    products: ICartProduct[];
    superId: string;
    missingProducts?: string[];
    totalCost: number;
    address: IAddress; 
    createdAt?: Date;
    updatedAt?: Date;
}

export const CartProductSchema = new Schema<ICartProduct>(
    {
      itemId: { type: String, required: true },
      quantity: { type: Number, required: true, min: 1 },
      price: { type: Number, required: true, min: 0 },
    },
    { _id: false }
  );
  

const cartSchema = new mongoose.Schema<ICart>({
  shoppingListId: { type: String, required: true },
  products: { type: [CartProductSchema], default: [] },
  superId: { type: String, required: true },
  totalCost: { type: Number, required: true },
  address: { type: addressSchema, required: true },
}, { timestamps: true });

const Cart = mongoose.model<ICart>('Cart', cartSchema);
export default Cart;