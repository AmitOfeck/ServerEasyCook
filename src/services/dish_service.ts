import DishModel from "../models/dish_model";
import { OpenAI } from 'openai';

const openai = new OpenAI({
    apiKey: "",
});

export async function findByCreator(userId: string) {
    return await DishModel.find({ createdBy: userId });
}

export async function insertDish(d: any) {
    const imagePrompt = `A delicious and beautifully plated dish called ${d.name}, high-resolution, professional food photography`;
    try {
        const imageResponse = await openai.images.generate({
            model: "dall-e-3",
            prompt: imagePrompt,
            size: "1024x1024"
        });

        if (imageResponse.data?.[0]?.url) {
            d.imageUrl = imageResponse.data[0].url;
        } else {
            d.imageUrl = '';
        }
    } catch (err: any) {
        console.error('Failed to generate dish image:', err?.response?.data || err.message || err);
        d.imageUrl = '';
    }

    const newDish = await DishModel.create(d);
    return newDish;
}

export async function deleteDish(id: string) {

    const deleted = await DishModel.findByIdAndDelete(id)
    return deleted
}

export async function updateDish(id: string, d_partial: any) {
    const updated = await DishModel.findByIdAndUpdate(id, d_partial, { new: true })
    return updated
}

export async function findAll() {
    return await DishModel.find({})
}

export async function findById(id: string) {
    return await DishModel.findById(id)
}

export async function findManyBy(key: string, value: string) {
    return await DishModel.find({ [key]: value })
}
export async function findOneBy(key: string, value: string) {
    return await DishModel.findOne({ [key]: value })
}