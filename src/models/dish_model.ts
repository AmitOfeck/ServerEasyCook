//import mongoose from 'mongoose'
// export interface Ingredient {
//     name: string
//     amount: string
// }

// export interface IDish {
//     _id: string
//     name: string

//     course: string
//     restrictions:string
//     ingredientsCost:number
//     averageDishCost:number
//     difficulty:string

//     calories:number
//     ingredients: Ingredient[]

//     recipe: string
//     rating: number
// }

// const IngredientSchema = new mongoose.Schema<Ingredient>({
//     name: {type: String, required: true},
//     amount: {type: String, required: true}
// })

// const DishSchema = new mongoose.Schema<IDish>({
//     name: {type: String, required: true},

//     course: {type:String, required:false},
//     restrictions:{type:String, required:false},
//     ingredientsCost:{type: Number, required: true},
//     averageDishCost:{type: Number, required: true},
//     difficulty:{type: String, required: true},

//     calories:{type: Number, required: true},
//     ingredients:[IngredientSchema],
//     recipe: {type:String, required: false},
//     rating: {type: Number, default: 0}
// })

// const DishModel = mongoose.model("dishes", DishSchema)

// export default DishModel


import mongoose, { Document, Schema } from 'mongoose';

export enum Cuisine {
  ITALIAN = 'ITALIAN',
  CHINESE = 'CHINESE',
  INDIAN = 'INDIAN',
  MEXICAN = 'MEXICAN',
  // Add more as needed
}

export enum Limitation {
  VEGETARIAN = 'VEGETARIAN',
  VEGAN = 'VEGAN',
  GLUTEN_FREE = 'GLUTEN_FREE',
  // Add more as needed
}

export enum Level {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export interface IDish extends Document {
  name: string;
  price: number;
  cuisine: Cuisine;
  limitation: Limitation;
  level: Level;
  ingredients: string[];
  details: string;
  createdAt: Date;
  updatedAt: Date;
}

const DishSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      maxlength: 100,
      match: /^[A-Za-z0-9 ]+$/,
    },
    price: { type: Number, required: true, min: 0, max: 1000 },
    cuisine: {
      type: String,
      required: true,
      enum: Object.values(Cuisine),
    },
    limitation: {
      type: String,
      required: true,
      enum: Object.values(Limitation),
    },
    level: {
      type: String,
      required: true,
      enum: Object.values(Level),
    },
    ingredients: { type: [String], default: [] },
    details: { type: String, default: '' },
  },
  { timestamps: true }
);

export const DishModel = mongoose.model<IDish>('Dish', DishSchema);
 export default DishModel


