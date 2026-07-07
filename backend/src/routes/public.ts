import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { getPublicStoreProducts } from '../controllers/product.controller';

const publicRouter = Router();

publicRouter.get('/stores', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stores = await prisma.store.findMany({
      select: {
        id: true,
        store_name: true,
        store_slug: true,
        created_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return res.status(200).json({ stores });
  } catch (error) {
    return next(error);
  }
});

publicRouter.get('/stores/:slug/products', getPublicStoreProducts);

export { publicRouter };
