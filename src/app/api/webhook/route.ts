import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '@/config/stripe';
import { generateServerClient } from '@/lib/amplify-utils';
import { OrderStatus } from '@/features/order/types';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = headers().get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const client = generateServerClient();

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Update order status to PAID
        const { data: orders } = await client.models.Order.list({
          filter: {
            stripePaymentIntentId: { eq: paymentIntent.id }
          }
        });

        if (orders && orders.length > 0) {
          const order = orders[0];
          await client.models.Order.update({
            id: order.id,
            status: OrderStatus.PAID,
            updatedAt: new Date().toISOString()
          });
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Update order status to CANCELLED
        const { data: orders } = await client.models.Order.list({
          filter: {
            stripePaymentIntentId: { eq: paymentIntent.id }
          }
        });

        if (orders && orders.length > 0) {
          const order = orders[0];
          await client.models.Order.update({
            id: order.id,
            status: OrderStatus.CANCELLED,
            updatedAt: new Date().toISOString()
          });
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
} 