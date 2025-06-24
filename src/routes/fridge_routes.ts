import express from 'express';
import * as FridgeController from '../controllers/fridge_controller';
import { authMiddleware } from "../middleware/verifyToken";
import multer from 'multer';

const router = express.Router();
const upload = multer(); 

router.get('/', authMiddleware, FridgeController.getFridge);
router.post('/add', authMiddleware, FridgeController.addOrUpdateItem);
router.put('/clear', authMiddleware, FridgeController.clearFridge);

router.post('/ai-file', authMiddleware, upload.array('images', 8), FridgeController.aiIdentifyFridgeItemsFiles);

export default router;
