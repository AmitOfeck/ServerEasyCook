import mongoose, { Document, Schema, Types } from 'mongoose';

export enum Cuisine {
  NONE = 'NONE',
  ITALIAN = 'ITALIAN',
  CHINESE = 'CHINESE',
  INDIAN = 'INDIAN',
  MEXICAN = 'MEXICAN',
}

export enum Limitation {
  NONE = 'NONE',
  VEGETARIAN = 'VEGETARIAN',
  VEGAN = 'VEGAN',
  GLUTEN_FREE = 'GLUTEN_FREE',
}

export enum Level {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export type VariantType = 'original' | 'healthy' | 'cheap';

export interface IIngredient {
  name: string;
  unit: string;
  quantity: number;
  cost: number;
}

export interface IDish extends Document {
  name: string;
  price: number;
  cuisine: Cuisine;
  limitation: Limitation;
  level: Level;
  ingredients: IIngredient[];
  details: string;
  recipe: string;
  dishCalories: number;
  ingredientsCost: number;
  averageDishCost: number;
  imageUrl: string;
  createdBy: Types.ObjectId;
  parentDish?: Types.ObjectId;
  healthyVariant?: Types.ObjectId | null;
  cheapVariant?: Types.ObjectId | null;
  variantType: VariantType;
  createdAt: Date;
  updatedAt: Date;
}

const IngredientSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    unit: { type: String, default: '' },
    quantity: { type: Number, default: 0 },
    cost: { type: Number, default: 0 },
  },
  { _id: false }
);

const DishSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      maxlength: 100,
      match: /^[A-Za-z0-9\s,\.'\-]+$/,
    },
    price: { type: Number, required: true, min: 0, max: 1000 },
    cuisine: { type: String, required: true, enum: Object.values(Cuisine) },
    limitation: { type: String, required: true, enum: Object.values(Limitation) },
    level: { type: String, required: true, enum: Object.values(Level) },
    ingredients: { type: [IngredientSchema], default: [] },
    details: { type: String, default: '' },
    recipe: { type: String, default: '' },
    dishCalories: { type: Number, default: 0 },
    ingredientsCost: { type: Number, default: 0 },
    averageDishCost: { type: Number, default: 0 },
    imageUrl: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    parentDish: { type: Schema.Types.ObjectId, ref: 'Dish', default: null },
    healthyVariant: { type: Schema.Types.ObjectId, ref: 'Dish', default: null },
    cheapVariant: { type: Schema.Types.ObjectId, ref: 'Dish', default: null },
    variantType: {
      type: String,
      enum: ['original', 'healthy', 'cheap'],
      default: 'original',
      required: true,
    },
  },
  { timestamps: true }
);

export const DishModel = mongoose.model<IDish>('Dish', DishSchema);
export default DishModel;
