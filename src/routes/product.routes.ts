import { Router } from 'express'
import * as productController from '../controllers/product.controller.js'
import { authenticate, requireRoles } from '../middleware/auth.middleware.js'

const router = Router()

router.get('/', productController.listProducts)
router.get('/categories/list', productController.listCategories)
router.get('/slug/:slug', productController.getProductBySlug)
router.get('/:id/related', productController.getRelated)
router.get('/:id', productController.getProduct)

router.post('/', authenticate, requireRoles('admin', 'seller'), productController.createProduct)
router.put('/:id', authenticate, requireRoles('admin', 'seller'), productController.updateProduct)
router.delete('/:id', authenticate, requireRoles('admin', 'seller'), productController.deleteProduct)

export default router
