import { Router } from 'express';
import { authenticateJwt } from '../middleware/auth';
import { createProduct, deleteProduct, getProducts, updateProduct } from '../controllers/product.controller';

const productRouter = Router();
productRouter.use(authenticateJwt);

productRouter.get('/', getProducts);
productRouter.post('/', createProduct);
productRouter.put('/:productId', updateProduct);
productRouter.delete('/:productId', deleteProduct);

export { productRouter };
