import { Request, Response } from 'express';
import userService from '../services/user_service';
import { validateFieldsValues } from "../utils/validations";
import { addressValidators, userValidators } from "../models/user_model";
import { upload , deleteFile } from "../utils/files"

const getUserProfile = async (req: Request, res: Response) => {
    try {
        const user = await userService.getUserById(req.params.id);
        res.status(200).send(user);
    } catch (err) {
        res.status(400).send(err);
    }
};

const register = async (req: Request, res: Response) => {
    try {
        if (req.body.address) {
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
    const userId = req.params.id;

    try {
        const existingUser = await userService.getUserById(userId);
        if (!existingUser) {
            res.status(404).json({ message: "User not found." });
            return;
        }

        const updateData = { ...req.body };

        if (req.file) {
            updateData.profileImage = `/uploads/${req.file.filename}`;

            if (existingUser.profileImage) {
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



export default { getUserProfile, register , updateUser};