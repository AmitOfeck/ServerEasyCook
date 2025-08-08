import UserModel from '../models/user_model';
import DishModel from '../models/dish_model';
import mongoose from 'mongoose';
import { IUser } from '../models/user_model';
import bcrypt from 'bcrypt';

class UserService {

  async createUser(userData: IUser) {
    const password = userData.password;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    userData.password = hashedPassword;
    
    const user = new UserModel( userData );
    
    if(userData.profileImage) {
      const imageUrl = `/uploads/${userData.profileImage}`;
      user.profileImage = imageUrl;
    }

    return user.save();
  }

  async updateUser(userId: string, updateData: Partial<IUser>) {
    return UserModel.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true });
}

  async getUserById(userId: string) {
    return UserModel.findById(userId);
  }

  async getUserByEmail(userEmail: string) : Promise<IUser[]> {
    return UserModel.find({ email: userEmail });
  }

  async getUserByUserName(userName: string) : Promise<IUser[]> {
    return UserModel.find({ userName });
  }

  async addFavoriteDish(userId: string, dishId: string) {
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(dishId)) {
        throw new Error("Invalid userId or dishId");
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const dishObjectId = new mongoose.Types.ObjectId(dishId);

    const user = await UserModel.findById(userObjectId);
    if (!user) {
        throw new Error("User not found");
    }

    const dish = await DishModel.findById(dishObjectId);
    if (!dish) {
        throw new Error("Dish not found");
    }

    if (user.favoriteDishes.includes(dishObjectId)) {
        throw new Error("Dish is already in favorites");
    }

    user.favoriteDishes.push(dishObjectId);
    await user.save();

    return user;
}

async addMadeDishes(userId: string, dishIds: string[]) {
  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !dishIds.every(id => mongoose.Types.ObjectId.isValid(id))
  ) {
    throw new Error("Invalid userId or dishIds");
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const dishObjectIds = dishIds.map(id => new mongoose.Types.ObjectId(id));

  const user = await UserModel.findById(userObjectId);
  if (!user) {
    throw new Error("User not found");
  }

  const existingDishIds = new Set(user.madeDishes.map(id => id.toString()));

  const newDishesToAdd = dishObjectIds.filter(
    id => !existingDishIds.has(id.toString())
  );

  user.madeDishes.push(...newDishesToAdd);

  await user.save();
  return user;
}

  
}

export default new UserService();