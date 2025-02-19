import { NextResponse } from 'next/server';
import { stripe } from '@/config/stripe';
import { generateServerClient } from '@/lib/amplify-utils';

export async function POST(request: Request) {
  try {
    const { total, orderId, restaurantId } = await request.json();
    
    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100), // Convert to cents
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        orderId,
        restaurantId,
      },
    });

    // Update the existing order with payment processing status and payment intent ID
    const client = generateServerClient();
    const { data: order, errors } = await client.models.Order.update({
      id: orderId,
      status: 'PAYMENT_PROCESSING',
      stripePaymentIntentId: paymentIntent.id,
      updatedAt: new Date().toISOString()
    });

    if (errors || !order) {
      throw new Error('Failed to update order');
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      orderId: order.id,
    });
  } catch (err) {
    console.error('Error:', err);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
} 