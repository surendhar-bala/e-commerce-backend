import { Router } from 'express'
import * as orderController from '../controllers/order.controller.js'
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware.js'

const router = Router()

router.get('/', authenticate, orderController.listOrders)
router.get('/:id', authenticate, orderController.getOrder)
router.post('/', optionalAuthenticate, orderController.createOrder)

export default router
