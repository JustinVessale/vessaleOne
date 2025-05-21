import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { createStripe } from '@/config/stripe';
import { generateServerClient } from '@/lib/amplify-utils';
import Stripe from 'stripe';

const stripe = createStripe();
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Helper function to handle webhook errors
const handleWebhookError = (error: unknown) => {
  console.error('Webhook error:', error);
  if (error instanceof Stripe.errors.StripeError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode || 500 }
    );
  }
  return NextResponse.json(
    { error: 'Webhook handler failed' },
    { status: 500 }
  );
};

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature found in request' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    const client = generateServerClient();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { orderId } = session.metadata || {};

        if (!orderId) {
          throw new Error('No orderId in session metadata');
        }

        // Update order status and add customer info
        const { errors } = await client.models.Order.update({
          id: orderId,
          status: 'PAID',
          customerEmail: session.customer_details?.email || undefined,
          customerPhone: session.customer_details?.phone || undefined,
          deliveryAddress: session.shipping_details?.address?.line1 
            ? `${session.shipping_details.address.line1}, ${session.shipping_details.address.city}, ${session.shipping_details.address.state} ${session.shipping_details.address.postal_code}`
            : undefined,
          updatedAt: new Date().toISOString()
        });

        if (errors) {
          throw new Error('Failed to update order status');
        }

        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { orderId } = session.metadata || {};

        if (!orderId) {
          throw new Error('No orderId in session metadata');
        }

        // Update order status
        const { errors } = await client.models.Order.update({
          id: orderId,
          status: 'CANCELLED',
          updatedAt: new Date().toISOString()
        });

        if (errors) {
          throw new Error('Failed to update order status');
        }

        break;
      }

      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { orderId } = session.metadata || {};

        if (!orderId) {
          throw new Error('No orderId in session metadata');
        }

        // Update order status for successful async payment
        const { errors } = await client.models.Order.update({
          id: orderId,
          status: 'PAID',
          updatedAt: new Date().toISOString()
        });

        if (errors) {
          throw new Error('Failed to update order status');
        }

        break;
      }

      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { orderId } = session.metadata || {};

        if (!orderId) {
          throw new Error('No orderId in session metadata');
        }

        // Update order status for failed async payment
        const { errors } = await client.models.Order.update({
          id: orderId,
          status: 'CANCELLED',
          updatedAt: new Date().toISOString()
        });

        if (errors) {
          throw new Error('Failed to update order status');
        }

        break;
      }

      // Add more event handlers as needed
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    return handleWebhookError(err);
  }
} 