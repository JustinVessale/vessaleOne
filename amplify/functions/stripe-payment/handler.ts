import type { APIGatewayProxyHandler } from "aws-lambda";
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia'
});

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const { total, orderId, restaurantId } = JSON.parse(event.body || '{}');

    const paymentIntent = await stripe.paymentIntents.create({
      amount: total * 100, // Stripe expects amount in cents
      currency: 'usd',
      metadata: {
        orderId,
        restaurantId
      }
    });

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*"
      },
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        orderId
      })
    };
  } catch (error) {
    console.error('Payment intent creation failed:', error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*"
      },
      body: JSON.stringify({ error: 'Failed to create payment intent' })
    };
  }
}; 