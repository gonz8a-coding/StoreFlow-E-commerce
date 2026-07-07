import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.warn('Warning: STRIPE_SECRET_KEY is not set. Stripe features will be disabled until configured.');
}

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2022-11-15' })
  : null;

export const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
