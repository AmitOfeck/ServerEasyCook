import express from "express";
import userController from "../controllers/user_controler";

const router = express.Router();

router.post("/:id", userController.getUserProfile);

export default router;
