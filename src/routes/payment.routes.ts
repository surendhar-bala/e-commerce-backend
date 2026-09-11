import { Router } from 'express'
import * as paymentController from '../controllers/payment.controller.js'
import { optionalAuthenticate } from '../middleware/auth.middleware.js'

const router = Router()

router.post('/create-intent', optionalAuthenticate, paymentController.createIntent)
router.post('/verify', optionalAuthenticate, paymentController.verifyPayment)

export default router
