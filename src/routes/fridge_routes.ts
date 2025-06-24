import express from 'express';
import * as FridgeController from '../controllers/fridge_controller';
import { authMiddleware } from "../middleware/verifyToken";

const router = express.Router();

router.get('/', authMiddleware, FridgeController.getFridge);
router.post('/add', authMiddleware, FridgeController.addOrUpdateItem);
router.put('/clear', authMiddleware, FridgeController.clearFridge);

router.post('/ai', authMiddleware, FridgeController.aiIdentifyFridgeItems);

export default router;
