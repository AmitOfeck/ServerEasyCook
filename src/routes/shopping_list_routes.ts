import express from 'express';
import * as ShoppingListController from '../controllers/shopping_list_controller';
import {authMiddleware} from "../middleware/verifyToken";

const router = express.Router();


router.get('/', authMiddleware, ShoppingListController.getList);
router.post('/add', authMiddleware, ShoppingListController.addItem);
router.put('/update-quantity', authMiddleware, ShoppingListController.updateItemQuantity);
router.put('/remove', authMiddleware, ShoppingListController.removeItem);
router.put('/clear', authMiddleware, ShoppingListController.clearList);
router.post('/add-dishes', authMiddleware, ShoppingListController.addCombinedDishesToList);
router.put('/replace', authMiddleware, ShoppingListController.replaceItem);

export default router;
