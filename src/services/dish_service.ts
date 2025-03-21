import DishModel from "../models/dish_model";



export async function insertDish(d : any) {

    // d already validated here
    const newDish = await DishModel.create(d)
    return newDish
}

export async function deleteDish(id : string) {

    const deleted = await DishModel.findByIdAndDelete(id)
    return deleted
}

export async function updateDish(id: string, d_partial: any) {
    const updated = await DishModel.findByIdAndUpdate(id, d_partial, {new: true})
    return updated
}

export async function findAll() {
    return await DishModel.find({})
}

export async function findById(id: string) {
    return await DishModel.findById(id)
}

export async function findManyBy(key: string, value: string) {
    return await DishModel.find({[key]: value})
}
export async function findOneBy(key: string, value: string) {
    return await DishModel.findOne({[key]: value})
}