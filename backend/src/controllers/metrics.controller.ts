import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';

export async function getStoreMetrics(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.storeId as string;
    if (!storeId) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Store context is required for metrics retrieval.' });
    }

    const revenueAggregate = await prisma.order.aggregate({
      _sum: {
        total_amount: true,
      },
      where: {
        store_id: storeId,
        status: 'PAID',
      },
    });

    const inventoryAggregate = await prisma.product.aggregate({
      _sum: {
        stock: true,
      },
      where: {
        store_id: storeId,
        stock: {
          gt: 0,
        },
      },
    });

    const lowStockItems = await prisma.product.findMany({
      where: {
        store_id: storeId,
        stock: {
          lt: 5,
        },
      },
      select: {
        id: true,
        name: true,
        stock: true,
      },
      orderBy: {
        stock: 'asc',
      },
    });

    return res.status(200).json({
      success: true,
      metrics: {
        totalRevenue: revenueAggregate._sum.total_amount ?? 0,
        activeInventoryCount: inventoryAggregate._sum.stock ?? 0,
        lowStockWarnings: lowStockItems,
      },
    });
  } catch (error) {
    console.error('Metrics retrieval failed:', error);
    return next(error);
  }
}

export async function getStoreOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const storeId = req.storeId as string;
    if (!storeId) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Store context is required for order retrieval.' });
    }

    const orders = await prisma.order.findMany({
      where: { store_id: storeId },
      orderBy: { created_at: 'desc' },
      take: 50,
      include: {
        customer: {
          select: {
            name: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      orders: orders.map((order) => ({
        id: order.id,
        customerName: order.customer.name,
        totalAmount: order.total_amount,
        status: order.status,
        createdAt: order.created_at.toISOString().split('T')[0],
      })),
    });
  } catch (error) {
    console.error('Order retrieval failed:', error);
    return next(error);
  }
}
