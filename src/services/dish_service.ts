import DishModel from "../models/dish_model";
import { transformToHealthy, transformToCheap } from "./dish_transform_service";
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function findByCreator(userId: string) {
  return await DishModel.find({ createdBy: userId });
}

export async function insertDish(d: any) {
  // new dishes default to variantType 'original'
  const imagePrompt = `A delicious and beautifully plated dish called ${d.name}, high-resolution, professional food photography`;
  try {
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: imagePrompt,
      size: "1024x1024",
    });
    d.imageUrl = imageResponse.data?.[0]?.url ?? '';
  } catch (err: any) {
    console.error('Failed to generate dish image:', err?.response?.data || err.message || err);
    d.imageUrl = '';
  }

  const newDish = await DishModel.create(d);
  return newDish;
}

export async function deleteDish(id: string) {
  return await DishModel.findByIdAndDelete(id);
}

export async function updateDish(id: string, d_partial: any) {
  return await DishModel.findByIdAndUpdate(id, d_partial, { new: true });
}

export async function findAll() {
  return await DishModel.find({});
}

export async function findById(id: string) {
  return await DishModel.findById(id);
}

export async function findManyBy(key: string, value: string) {
  return await DishModel.find({ [key]: value });
}

export async function findOneBy(key: string, value: string) {
  return await DishModel.findOne({ [key]: value });
}

export async function healthifyDish(id: string) {
  const dish = await DishModel.findById(id).lean();
  if (!dish) return null;

  // if already has a healthyVariant, return it
  if (dish.healthyVariant) {
    return await DishModel.findById(dish.healthyVariant);
  }

  // create a new healthy variant
  const changes = await transformToHealthy(dish);
  const newDishData = {
    ...dish,
    ...changes,
    parentDish: dish._id,
    variantType: 'healthy',
  } as any;
  delete newDishData._id;

  const newDish = await DishModel.create(newDishData);
  await DishModel.findByIdAndUpdate(dish._id, {
    $set: { healthyVariant: newDish._id },
  });

  return newDish;
}

export async function cheapifyDish(id: string) {
  const dish = await DishModel.findById(id).lean();
  if (!dish) return null;

  // if already has a cheapVariant, return it
  if (dish.cheapVariant) {
    return await DishModel.findById(dish.cheapVariant);
  }

  // create a new cheap variant
  const changes = await transformToCheap(dish);
  const newDishData = {
    ...dish,
    ...changes,
    parentDish: dish._id,
    variantType: 'cheap',
  } as any;
  delete newDishData._id;

  const newDish = await DishModel.create(newDishData);
  await DishModel.findByIdAndUpdate(dish._id, {
    $set: { cheapVariant: newDish._id },
  });

  return newDish;
}