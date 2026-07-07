import { Router, Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../prisma';

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
const successUrl = process.env.STRIPE_SUCCESS_URL ?? `${frontendUrl}/checkout/success`;
const cancelUrl = process.env.STRIPE_CANCEL_URL ?? `${frontendUrl}/checkout/cancel`;
const mockSuccessUrl = `${frontendUrl}/checkout/success`;

if (!stripeSecret) {
  console.warn('Warning: STRIPE_SECRET_KEY is not set. Using mock checkout fallback for /api/checkout/session.');
}

const stripe = stripeSecret
  ? new Stripe(stripeSecret, { apiVersion: '2022-11-15' })
  : null;

const checkoutSessionSchema = z.object({
  storeSlug: z.string().min(3, 'Store slug is required.'),
  customerEmail: z.string().email('Customer email must be valid.').optional(),
  items: z.array(
    z.object({
      productId: z.string().uuid('Product ID must be a valid UUID.'),
      quantity: z.number().int().positive('Quantity must be at least 1.'),
    })
  ).nonempty('Checkout must contain at least one item.'),
});

type CheckoutItem = {
  productId: string;
  quantity: number;
};

type CheckoutSessionPayload = {
  storeSlug: string;
  customerEmail?: string;
  items: CheckoutItem[];
};

const router = Router();

function isStripeAuthError(error: unknown) {
  if (error instanceof Error) {
    return (
      error.message.includes('Invalid API Key') ||
      error.message.includes('No API key provided') ||
      error.message.includes('Unauthorized')
    );
  }
  return false;
}

async function createPaidMockOrder(
  storeId: string,
  customerId: string,
  payloadItems: CheckoutItem[],
  productMap: Map<string, any>,
  totalAmount: number
) {
  return prisma.$transaction(async (tx) => {
    for (const item of payloadItems) {
      const product = productMap.get(item.productId)!;
      await tx.product.update({
        where: { id: product.id },
        data: { stock: product.stock - item.quantity },
      });
    }

    return tx.order.create({
      data: {
        store_id: storeId,
        customer_id: customerId,
        total_amount: totalAmount,
        status: 'PAID',
        orderItems: {
          create: payloadItems.map((item) => ({
            product_id: item.productId,
            quantity: item.quantity,
            price: productMap.get(item.productId)?.price ?? 0,
          })),
        },
      },
    });
  });
}

router.post('/session', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload: CheckoutSessionPayload = checkoutSessionSchema.parse(req.body);

    const store = await prisma.store.findUnique({
      where: { store_slug: payload.storeSlug },
      select: { id: true },
    });

    if (!store) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Store not found.' });
    }

    const products = await prisma.product.findMany({
      where: {
        store_id: store.id,
        id: { in: payload.items.map((item) => item.productId) },
      },
    });

    if (products.length !== payload.items.length) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'One or more products are invalid or unavailable for this store.' });
    }

    const productMap = new Map(products.map((product) => [product.id, product]));
    const invalidItem = payload.items.find((item) => {
      const product = productMap.get(item.productId);
      return !product || product.stock < item.quantity;
    });

    if (invalidItem) {
      const product = productMap.get(invalidItem.productId);
      const errorMessage = product
        ? `Insufficient stock for product ${product.name}.`
        : 'One or more products are invalid or unavailable for this store.';

      return res.status(400).json({ error: 'BAD_REQUEST', message: errorMessage });
    }

    const totalAmount = payload.items.reduce((sum, item) => {
      const product = productMap.get(item.productId);
      return sum + (product?.price ?? 0) * item.quantity;
    }, 0);

    const customerEmail = payload.customerEmail?.trim().toLowerCase();
    const existingCustomer = customerEmail
      ? await prisma.customer.findUnique({ where: { email: customerEmail } })
      : null;

    if (existingCustomer && existingCustomer.store_id !== store.id) {
      return res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'This email is already registered for another storefront. Please use a different email address.',
      });
    }

    const orderCustomer =
      existingCustomer ??
      (await prisma.customer.create({
        data: {
          name: customerEmail ? 'Guest Customer' : 'Guest Shopper',
          email: customerEmail ?? `guest-${crypto.randomUUID()}@guest.storeflow.local`,
          store_id: store.id,
          password_hash: crypto.randomUUID(),
        },
      }));

    if (!stripe) {
      const order = await createPaidMockOrder(store.id, orderCustomer.id, payload.items, productMap, totalAmount);

      return res.status(201).json({
        success: true,
        checkoutUrl: mockSuccessUrl,
        orderId: order.id,
        message: 'Mock checkout completed successfully.',
      });
    }

    const order = await prisma.order.create({
      data: {
        store_id: store.id,
        customer_id: orderCustomer.id,
        total_amount: totalAmount,
        status: 'PENDING',
        orderItems: {
          create: payload.items.map((item) => ({
            product_id: item.productId,
            quantity: item.quantity,
            price: productMap.get(item.productId)?.price ?? 0,
          })),
        },
      },
    });

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        payment_intent_data: {
          metadata: {
            storeId: store.id,
            internalOrderId: order.id,
          },
        },
        line_items: payload.items.map((item) => ({
          price_data: {
            currency: 'usd',
            unit_amount: productMap.get(item.productId)?.price ?? 0,
            product_data: {
              name: productMap.get(item.productId)?.name ?? 'Unknown product',
              description: productMap.get(item.productId)?.description ?? undefined,
            },
          },
          quantity: item.quantity,
        })),
        client_reference_id: order.id,
        metadata: {
          storeId: store.id,
          internalOrderId: order.id,
        },
        customer_email: customerEmail,
        success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl,
      });

      if (typeof session.payment_intent === 'string') {
        await prisma.order.update({
          where: { id: order.id },
          data: { stripe_payment_intent: session.payment_intent },
        });
      }

      return res.status(201).json({
        success: true,
        checkoutUrl: session.url,
        sessionId: session.id,
        orderId: order.id,
      });
    } catch (error: unknown) {
      if (isStripeAuthError(error)) {
        console.warn('Stripe auth failed; falling back to mock checkout for customer order.', error);

        await prisma.$transaction(async (tx) => {
          for (const item of payload.items) {
            const product = productMap.get(item.productId)!;
            await tx.product.update({
              where: { id: product.id },
              data: { stock: product.stock - item.quantity },
            });
          }

          await tx.order.update({
            where: { id: order.id },
            data: {
              status: 'PAID',
              stripe_payment_intent: null,
            },
          });
        });

        return res.status(201).json({
          success: true,
          checkoutUrl: mockSuccessUrl,
          orderId: order.id,
          message: 'Stripe key invalid or unauthorized; customer order was logged and completed via mock checkout.',
        });
      }
      throw error;
    }
  } catch (error: unknown) {
    console.error('Checkout session creation failed:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', issues: error.format() });
    }
    return next(error);
  }
});

export { router as checkoutRouter };
