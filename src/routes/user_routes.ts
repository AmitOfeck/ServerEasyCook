import userController from "../controllers/user_controler";
import express, { Request, Response, NextFunction } from "express";
import { upload } from "../utils/files"
import { validateFieldsValues, validateMandatoryFields } from "../utils/validations";
import { adressMandatoryFields, userMandatoryFields, userValidators, addressValidators } from "../models/user_model";
import {authMiddleware} from "../middleware/verifyToken";
import userService from "../services/user_service";

const router = express.Router();

const validateRegister = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!validateMandatoryFields(req.body, userMandatoryFields)) {
        res.status(400).json({ message: 'Missing mandatory user fields, cannot register user.' });
        return;
    }

    if(!validateFieldsValues(req.body, userValidators)){
        res.status(400).json({ message: 'Invalid user fields, cannot register user.' });
        return;
    }

    if (req.body?.address && !validateMandatoryFields(JSON.parse(req.body.address), adressMandatoryFields)) {
        console.log(req.body.address)
        res.status(400).json({ message: 'Missing mandatory address fields, cannot register user.' });
        return;
    }

    if(!validateFieldsValues(JSON.parse(req.body.address), addressValidators)){
        res.status(400).json({ message: 'Invalid address fields, cannot register user.' });
        return;
    }
    
    let user = await userService.getUserByEmail(req.body.email);
    if (user.length > 0) {
        res.status(400).json({ message: 'Email already exists.' });
        return;
    }

    user = await userService.getUserByUserName(req.body.userName);
    if (user.length > 0) {
        res.status(400).json({ message: 'User Name already exists.' });
        return;
    }

    next();
};

router.get("/favorite-dishes", authMiddleware, userController.getFavoriteDishes);

router.get("/:id", userController.getUserProfile);

router.post("/register", upload.single("profileImage"), validateRegister, userController.register);

router.patch("/:id", upload.single("profileImage"), userController.updateUser);

router.post("/favorite/:dishId", authMiddleware, userController.addFavoriteDish);


export default router;
