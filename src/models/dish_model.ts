import mongoose from 'mongoose'

export interface Ingredient {
    name: string
    amount: string
}

export interface IDish {
    _id: string
    name: string

    course: string
    restrictions:string
    ingredientsCost:number
    averageDishCost:number
    difficulty:string

    calories:number
    ingredients: Ingredient[]

    recipe: string
    rating: number
}

const IngredientSchema = new mongoose.Schema<Ingredient>({
    name: {type: String, required: true},
    amount: {type: Number, required: true}
})

const DishSchema = new mongoose.Schema<IDish>({
    name: {type: String, required: true},

    course: {type:String, required:false},
    restrictions:{type:String, required:false},
    ingredientsCost:{type: Number, required: true},
    averageDishCost:{type: Number, required: true},
    difficulty:{type: String, required: true},

    calories:{type: Number, required: true},
    ingredients:[IngredientSchema],
    recipe: {type:String, required: false},
    rating: {type: Number, default: 0}
})

const DishModel = mongoose.model("dishes", DishSchema)

export default DishModel