import mongoose, { Schema, Document } from 'mongoose';

export interface IShoppingItem {
  name: string;
  unit: string;
  quantity: number;
}

export interface IShoppingList extends Document {
  userId: string;
  items: IShoppingItem[];
  preparedDishes: Map<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

const ShoppingItemSchema = new Schema<IShoppingItem>(
  {
    name: { type: String, required: true },
    unit: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const ShoppingListSchema = new Schema<IShoppingList>(
  {
    userId: { type: String, required: true },
    items: { type: [ShoppingItemSchema], default: [] },
    preparedDishes: { type: Map, of: Number, default: {} }
  },
  { timestamps: true }
);

export const ShoppingListModel = mongoose.model<IShoppingList>('ShoppingList', ShoppingListSchema);

export default ShoppingListModel;
