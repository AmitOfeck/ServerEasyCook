// models/fridge_model.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IFridgeItem {
  name: string;
  unit: string | null;
  quantity: number | null;
}

export interface IFridge extends Document {
  userId: string;
  items: IFridgeItem[];
  createdAt: Date;
  updatedAt: Date;
}

const FridgeItemSchema = new Schema<IFridgeItem>(
  {
    name: { type: String, required: true },
    unit: { type: String, default: null },
    quantity: { type: Number, default: null, min: 0 },
  },
  { _id: false }
);

const FridgeSchema = new Schema<IFridge>(
  {
    userId: { type: String, required: true },
    items: { type: [FridgeItemSchema], default: [] }
  },
  { timestamps: true }
);

export const FridgeModel = mongoose.model<IFridge>('Fridge', FridgeSchema);
export default FridgeModel;
