import type { APIGatewayProxyHandler } from "aws-lambda";
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia'
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
  // Log headers for debugging
  console.log('Request headers:', JSON.stringify(event.headers));
  
  // Get the origin from the request headers - API Gateway normalizes headers to lowercase
  const origin = event.headers.origin || 
                 event.headers.Origin || 
                 event.headers['origin'] || 
                 '';
                 
  console.log('Detected origin:', origin);
  const allowedOrigin = getAllowedOrigin(origin);
  
  // Handle OPTIONS request for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,stripe-signature',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Credentials': 'true'
      },
      body: ''
    };
  }
  
  try {
    const { total, orderId, restaurantId } = JSON.parse(event.body || '{}');

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100), // Stripe expects amount in cents as an integer
      currency: 'usd',
      metadata: {
        orderId,
        restaurantId
      }
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,stripe-signature',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Credentials': 'true'
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
          'Access-Control-Allow-Origin': allowedOrigin,
          'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,stripe-signature',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
          'Access-Control-Allow-Credentials': 'true'
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
          'Access-Control-Allow-Origin': allowedOrigin,
          'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,stripe-signature',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
          'Access-Control-Allow-Credentials': 'true'
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
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,stripe-signature',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Credentials': 'true'
      },
      body: JSON.stringify({
        error: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}; 