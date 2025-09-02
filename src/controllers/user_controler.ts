import { NextFunction, Request, Response } from 'express';
import userService from '../services/user_service';
import * as DishService from '../services/dish_service'
import { validateFieldsValues } from "../utils/validations";
import { addressValidators, userValidators } from "../models/user_model";
import { deleteFile } from "../utils/files"
import { IDish } from '../models/dish_model';


const getUserProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = (req as any).userId
        const user = await userService.getUserById(userId);
        
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        const dishes = await DishService.findByCreator(userId);
        console.log(dishes);
        const profile = {
            ...user.toObject(),
            dishes,
        };

        res.status(200).json(profile);
    } catch (err) {
        console.error('Error in getUserProfile:', err);
        res.status(500).json({ message: 'Failed to fetch profile', error: err });
    }
};


const register = async (req: Request, res: Response) => {
    try {
        if (req.body.address && Object.keys(JSON.parse(req.body.address)).length != 0) {
            req.body.addresses = [JSON.parse(req.body.address)];
        } else {
            req.body.addresses = [];
        } 
        req.body.profileImage = req.file?.filename;
        const user = await userService.createUser(req.body);
        res.status(200).send(user);
    } catch (err) {
        console.log(err);
        res.status(400).send(err);
    }
};

const updateUser = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).userId

    try {
        const existingUser = await userService.getUserById(userId);
        if (!existingUser) {
            res.status(404).json({ message: "User not found." });
            return;
        }

        const updateData = { ...req.body };
        if (req.file) {
            updateData.profileImage = `/uploads/${req.file.filename}`;

            if (existingUser.profileImage && 
                !existingUser.profileImage.startsWith('http://') && 
                !existingUser.profileImage.startsWith('https://')) {
                deleteFile(existingUser.profileImage); 
            }
        }

        if (req.body.address) {
            try {
                const parsedAddress = JSON.parse(req.body.address);
                if (!validateFieldsValues(parsedAddress, addressValidators)) {
                    res.status(400).json({ message: "Invalid address fields." });
                    return;
                }
                updateData.addresses = [parsedAddress];
            } catch (error) {
                res.status(400).json({ message: "Invalid address format." });
                return;
            }
        }

        if (updateData.userName) {
            const existingUserByName = await userService.getUserByUserName(updateData.userName);
            if (existingUserByName.length > 0 && existingUserByName[0]?._id?.toString() !== userId) {
                res.status(400).json({ message: "User Name already exists." });
                return;
            }

            if (!validateFieldsValues({ userName: updateData.userName }, userValidators)) {
                res.status(400).json({ message: "Invalid username format." });
                return;
            }
        }

        delete updateData.password;
        delete updateData.email;

        const updatedUser = await userService.updateUser(userId, updateData);
        if (!updatedUser) {
            res.status(404).json({ message: "User not found." });
            return;
        }

        res.status(200).json(updatedUser);
    } catch (err) {
        console.error(`Error updating user: ${err}`);
        res.status(500).json({ message: "Internal server error" });
    }
};

const addFavoriteDish = async (req: Request, res: Response): Promise<void> => {
    try {

        const userId = req.params.userId;
        const { dishId } = req.params;

        const updatedUser = await userService.addFavoriteDish(userId, dishId);
        res.status(200).json({ message: "Dish added to favorites", user: updatedUser });
    } catch (err) {
        res.status(400).json({ message: err instanceof Error ? err.message : "An error occurred" });
    }
};

const getRecommendedDishes = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).userId
        const recommendedDishes: IDish[] = await userService.getRecommendedDishes(userId);
        res.status(200).json(recommendedDishes);
    } catch (err) {
        res.status(500).json({ message: err instanceof Error ? err.message : "An error occurred" });
    }
};

const getMadeDishes = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).userId
        const madeDishes: IDish[] = await userService.getMadeDishes(userId);
        res.status(200).json(madeDishes);
    } catch (err) {
        res.status(500).json({ message: err instanceof Error ? err.message : "An error occurred" });
    }
};

const getFavoriteDishes = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).userId
        const favoriteDishes: IDish[] = await userService.getFavoriteDishes(userId);
        res.status(200).json(favoriteDishes);
    } catch (err) {
        res.status(500).json({ message: err instanceof Error ? err.message : "An error occurred" });
    }
};


export default { getUserProfile, register , updateUser , addFavoriteDish, getRecommendedDishes, getMadeDishes, getFavoriteDishes};