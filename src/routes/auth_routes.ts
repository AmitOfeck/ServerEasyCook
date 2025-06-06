import express from "express";
import authController from "../controllers/auth_controller"

const router = express.Router();


router.post("/login", authController.login);

router.post("/google/login", authController.googleSignin);

router.post("/refresh", authController.refresh);

export default router;
