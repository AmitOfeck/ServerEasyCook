import express from 'express'
import * as cartController from '../controllers/cart_controller'
import { authMiddleware } from '../middleware/verifyToken'
const router = express.Router()

router.get("/:id", )
router.get("/bestCart", authMiddleware, cartController.getBestCart)

export default router