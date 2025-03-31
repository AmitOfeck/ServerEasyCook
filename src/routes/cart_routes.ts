import express from 'express'
import * as cartController from '../controllers/cart_controller'
const router = express.Router()

router.get("/:id", )
router.get("/bestCart/:userId", cartController.getBestCart)

export default router