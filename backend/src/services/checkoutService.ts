import { prisma } from '../prisma';
import type { Prisma } from '@prisma/client';

export interface CheckoutItem {
  productId: string;
  quantity: number;
}

export interface CheckoutPayload {
  storeId: string;
  customerId: string;
  items: CheckoutItem[];
}

export async function processCheckout(payload: CheckoutPayload) {
  const { customerId, storeId, items } = payload;

  if (!items.length) {
    throw new Error('Checkout cart must contain at least one item.');
  }

  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const productUpdates = await Promise.all(
      items.map(async (item) => {
        const updated = await tx.product.updateMany({
          where: {
            id: item.productId,
            store_id: storeId,
            stock: {
              gte: item.quantity,
            },
          },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });

        if (updated.count === 0) {
          throw new Error(`Product ${item.productId} is out of stock or insufficient quantity available.`);
        }

        return tx.product.findUnique({ where: { id: item.productId } });
      })
    );

    const products = await Promise.all(productUpdates);

    if (products.some((product) => product === null)) {
      throw new Error('One or more products could not be loaded during checkout.');
    }

    const orderTotal = items.reduce((total, item) => {
      const product = products.find((p) => p?.id === item.productId);
      return total + (product?.price ?? 0) * item.quantity;
    }, 0);

    const order = await tx.order.create({
      data: {
        store_id: storeId,
        customer_id: customerId,
        total_amount: orderTotal,
        status: 'PENDING',
        orderItems: {
          create: items.map((item) => ({
            product_id: item.productId,
            quantity: item.quantity,
            price: products.find((p) => p?.id === item.productId)?.price ?? 0,
          })),
        },
      },
      include: {
        orderItems: true,
      },
    });

    return order;
  });
}
