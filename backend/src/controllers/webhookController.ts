import { Request, Response, NextFunction } from 'express';
import { stripe, webhookSecret } from '../utils/stripe';
import { handleStripeEvent } from '../services/webhookService';

export async function webhookController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!stripe) {
      throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in .env to enable webhook processing.');
    }
    if (!webhookSecret) {
      throw new Error('Stripe webhook secret is not configured.');
    }

    const signature = req.headers['stripe-signature'];
    const payload = req.body as Buffer;

    if (!signature) {
      return res.status(400).json({ error: 'Missing Stripe signature header.' });
    }

    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    const result = await handleStripeEvent(event);
    res.json({ received: true, ...result });
  } catch (error) {
    console.error('Stripe webhook verification failed:', error);
    res.status(400).json({ error: 'Webhook verification failed.' });
  }
}
