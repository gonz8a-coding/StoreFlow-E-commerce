import { Router } from 'express';
import { authenticateJwt } from '../middleware/auth';
import { getStoreMetrics, getStoreOrders } from '../controllers/metrics.controller';

const adminRouter = Router();

adminRouter.get('/metrics', authenticateJwt, getStoreMetrics);
adminRouter.get('/orders', authenticateJwt, getStoreOrders);

export { adminRouter };
