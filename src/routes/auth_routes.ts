import express, { Request, Response, NextFunction } from "express";
import authController from "../controllers/auth_controller";
import { upload } from "../utils/files"
import { validateMandatoryFields } from "../utils/validations";
import { adressMandatoryFields, userMandatoryFields } from "../models/user_model";

const validateRegister = (req: Request, res: Response, next: NextFunction): void => {
    if (!validateMandatoryFields(req.body, userMandatoryFields)) {
        res.status(400).json({ message: 'Missing mandatory user fields, cannot register user.' });
        return;
    }

    if (req.body?.addresses && !validateMandatoryFields(req.body?.addresses[0], adressMandatoryFields)) {
        res.status(400).json({ message: 'Missing mandatory address fields, cannot register user.' });
        return;
    }

    next();
};

const router = express.Router();

router.post("/register", validateRegister, upload.single("profileImage"), authController.register);

export default router;
