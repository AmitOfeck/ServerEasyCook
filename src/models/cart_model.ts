import mongoose, { ObjectId, Schema } from "mongoose";

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
}, { timestamps: true });

const Cart = mongoose.model<ICart>('Cart', cartSchema);
export default Cart;