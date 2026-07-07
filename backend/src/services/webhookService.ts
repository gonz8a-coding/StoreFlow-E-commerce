import { prisma } from '../prisma';
import Stripe from 'stripe';

export async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (!session.client_reference_id && !session.payment_intent) {
        throw new Error('Stripe checkout session payload is missing identifiers.');
      }

      const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
      const orderId = session.client_reference_id;

      if (!orderId || !paymentIntentId) {
        throw new Error('Missing order or payment intent reference in Stripe session.');
      }

      await prisma.order.updateMany({
        where: {
          id: orderId,
          stripe_payment_intent: paymentIntentId,
        },
        data: {
          status: 'PAID',
        },
      });

      return { message: 'Order updated to PAID.' };
    }
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      await prisma.order.updateMany({
        where: {
          stripe_payment_intent: paymentIntent.id,
        },
        data: {
          status: 'PAID',
        },
      });

      return { message: 'Order updated to PAID via PaymentIntent.' };
    }
    default:
      return { message: `Unhandled stripe event type: ${event.type}` };
  }
}
