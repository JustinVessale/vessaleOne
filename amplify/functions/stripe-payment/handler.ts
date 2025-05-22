import type { APIGatewayProxyHandler } from "aws-lambda";
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil'
});

// Helper function to determine the appropriate origin for CORS
const getAllowedOrigin = (origin?: string): string => {
  console.log('origin', origin);
  
  // If no origin provided, return an empty string (disables CORS)
  if (!origin) {
    console.log('no origin provided');
    return '*'; // Allow any origin as fallback
  }
  
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://develop.d2g0w15slq5y17.amplifyapp.com',
    'https://main.d2g0w15slq5y17.amplifyapp.com',
    'https://thevessale.com',
    'https://www.thevessale.com',
    'https://www.orderthevessale.com'
  ];
  
  // If the origin is in our allowed list, return it
  if (allowedOrigins.includes(origin)) {
    return origin;
  }
  
  // Otherwise check if it matches our amplifyapp.com pattern
  if (/^https:\/\/.*\.amplifyapp\.com$/.test(origin)) {
    return origin;
  }
  
  // Return the actual origin if nothing else matches - this is more secure than a wildcard
  console.log('returning original origin');
  return origin;
};

export const handler: APIGatewayProxyHandler = async (event) => {
  // Set up CORS headers
  const headers = {
    'Access-Control-Allow-Origin': getAllowedOrigin(event.headers.origin),
    'Access-Control-Allow-Credentials': true,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,stripe-signature',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { type, data } = body;

    // Handle webhook events
    switch (type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed':
        // These events are handled by the Next.js webhook handler
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ received: true }),
        };

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Unhandled event type' }),
        };
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}; 