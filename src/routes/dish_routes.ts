import express from 'express';
import * as DishController from '../controllers/dish_controller';
import { authMiddleware } from '../middleware/verifyToken';

const router = express.Router();

router.get("/", DishController.findAll);
router.get("/:id", DishController.findById);
router.get("/search_one", DishController.findOne);
router.get("/search_many", DishController.findMany);

router.post("/", authMiddleware, DishController.insertDish);
router.put("/:id", authMiddleware, DishController.updateDish);
router.delete("/:id", authMiddleware, DishController.deleteDish);

router.post("/:id/healthify", authMiddleware, DishController.healthifyDish);
router.post("/:id/cheapify", authMiddleware, DishController.cheapifyDish);

export default router;
