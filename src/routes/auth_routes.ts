import express, { Request, Response, NextFunction } from "express";
import authController from "../controllers/auth_controller";
import { upload } from "../utils/files"
import { validateMandatoryFields } from "../utils/validations";
import { adressMandatoryFields, userMandatoryFields } from "../models/user_model";
import userService from "../services/user_service";

const validateRegister = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!validateMandatoryFields(req.body, userMandatoryFields)) {
        res.status(400).json({ message: 'Missing mandatory user fields, cannot register user.' });
        return;
    }

    if (req.body?.addresses && !validateMandatoryFields(JSON.parse(req.body.addresses)[0], adressMandatoryFields)) {
        res.status(400).json({ message: 'Missing mandatory address fields, cannot register user.' });
        return;
    }
    
    const user = await userService.getUserByEmail(req.body.email);

    if (user.length > 0) {
        res.status(400).json({ message: 'User already exists.' });
        return;
    }

    next();
};

const router = express.Router();

router.post("/register", upload.single("profileImage"), validateRegister, authController.register);

export default router;
