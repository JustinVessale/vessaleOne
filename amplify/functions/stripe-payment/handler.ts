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
    console.error('Stripe error:', error);
    
    if (error instanceof Stripe.errors.StripeAuthenticationError) {
      return {
        statusCode: 401,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*"
        },
        body: JSON.stringify({
          error: 'Stripe Authentication Error',
          details: `Invalid or missing API key. Please check your Stripe configuration. ${error.message}`,
          type: 'StripeAuthenticationError'
        })
      };
    }

    if (error instanceof Stripe.errors.StripeError) {
      return {
        statusCode: error.statusCode || 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*"
        },
        body: JSON.stringify({
          error: 'Failed to create payment intent',
          details: error.message,
          type: error.type
        })
      };
    }

    // Handle non-Stripe errors
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*"
      },
      body: JSON.stringify({
        error: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}; 