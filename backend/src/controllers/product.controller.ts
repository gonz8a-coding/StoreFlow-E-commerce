import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';

const createProductSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.'),
  description: z.string().max(1000).optional(),
  price: z.number().int().nonnegative('Price must be a non-negative integer.'),
  stock: z.number().int().nonnegative('Stock must be a non-negative integer.'),
  images: z.array(z.string().url()).optional(),
});

const storeSlugSchema = z.object({
  slug: z
    .string()
    .min(3, 'Store slug must be at least 3 characters long.')
    .max(64, 'Store slug must be 64 characters or less.')
    .regex(/^[a-z0-9-]+$/, 'Store slug must contain only lowercase letters, numbers, and hyphens.'),
});

const updateProductSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters.').optional(),
    description: z.string().max(1000).optional(),
    price: z.number().int().nonnegative('Price must be a non-negative integer.').optional(),
    stock: z.number().int().nonnegative('Stock must be a non-negative integer.').optional(),
    images: z.array(z.string().url()).optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: 'At least one product field must be updated.',
  });

const productIdParam = z.object({
  productId: z.string().uuid('Product ID must be a valid UUID.'),
});

export async function getProducts(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.storeId) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Store context is required to fetch products.' });
    }

    const products = await prisma.product.findMany({
      where: { store_id: req.storeId },
      orderBy: { created_at: 'desc' },
    });

    return res.status(200).json({ success: true, products });
  } catch (error) {
    console.error('Product retrieval failed:', error);
    return next(error);
  }
}

export async function createProduct(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.storeId) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Store context is required for product creation.' });
    }

    const payload = createProductSchema.parse(req.body);
    const product = await prisma.product.create({
      data: {
        store_id: req.storeId,
        name: payload.name,
        description: payload.description ?? null,
        price: payload.price,
        stock: payload.stock,
        images: payload.images ?? [],
      },
    });

    return res.status(201).json({ success: true, product });
  } catch (error) {
    console.error('Product creation error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', issues: error.format() });
    }
    return next(error);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.storeId) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Store context is required for product updates.' });
    }

    const { productId } = productIdParam.parse(req.params);
    const payload = updateProductSchema.parse(req.body);

    const updateResult = await prisma.product.updateMany({
      where: {
        id: productId,
        store_id: req.storeId,
      },
      data: {
        name: payload.name,
        description: payload.description ?? undefined,
        price: payload.price,
        stock: payload.stock,
        images: payload.images,
      },
    });

    if (updateResult.count === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Product not found for this store.' });
    }

    const product = await prisma.product.findFirst({ where: { id: productId, store_id: req.storeId } });
    return res.status(200).json({ success: true, product });
  } catch (error) {
    console.error('Product update failed:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', issues: error.format() });
    }
    return next(error);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.storeId) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Store context is required for deleting products.' });
    }

    const { productId } = productIdParam.parse(req.params);

    const deleteResult = await prisma.product.deleteMany({
      where: {
        id: productId,
        store_id: req.storeId,
      },
    });

    if (deleteResult.count === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Product not found for this store.' });
    }

    return res.status(200).json({ success: true, message: 'Product deleted successfully.' });
  } catch (error) {
    console.error('Product deletion failed:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', issues: error.format() });
    }
    return next(error);
  }
}

export async function getPublicStoreProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const { slug } = storeSlugSchema.parse(req.params);

    const store = await prisma.store.findUnique({
      where: { store_slug: slug },
      select: {
        id: true,
        store_name: true,
        store_slug: true,
        products: {
          where: { stock: { gt: 0 } },
          orderBy: { created_at: 'desc' },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            stock: true,
            images: true,
          },
        },
      },
    });

    if (!store) {
      return res.status(404).json({ error: 'STORE_NOT_FOUND', message: 'Store not found.' });
    }

    return res.status(200).json({
      success: true,
      store: {
        id: store.id,
        name: store.store_name,
        slug: store.store_slug,
      },
      products: store.products,
    });
  } catch (error) {
    console.error('Public storefront query failed:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', issues: error.format() });
    }
    return next(error);
  }
}
