import { generateClient } from 'aws-amplify/api';
import { post } from 'aws-amplify/api';
import type { Schema } from '../../../../amplify/data/resource';

const client = generateClient<Schema>();

const MOCK_API = import.meta.env.VITE_USE_MOCK_PAYMENT_API === 'true';
const MOCK_DELAY = 1000; // Simulate network delay

type CreatePaymentIntentParams = {
  orderId: string;
  total: number;
  restaurantId: string;
};

type CreatePaymentIntentResponse = {
  clientSecret: string;
  orderId: string;
};

// Mock implementation
async function mockCreatePaymentIntent(_params: CreatePaymentIntentParams): Promise<CreatePaymentIntentResponse> {
  await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
  // Simulate an error
  throw new Error('This is a mock error. Payment API is in test mode.');
}

export async function createPaymentIntent(params: CreatePaymentIntentParams): Promise<CreatePaymentIntentResponse> {
  try {
    // First validate we have a valid order ID
    if (!params.orderId) {
      throw new Error('No order ID provided');
    }

    console.log('Attempting payment intent creation for order:', params.orderId);

    // Use mock implementation if enabled
    if (MOCK_API) {
      console.log('Using mock payment API');
      return mockCreatePaymentIntent(params);
    }

    console.log('Using Real API');
    const { data, errors } = await client.models.Order.update({
      id: params.orderId,
      stripePaymentIntentId: 'pending',
      status: 'PAYMENT_PROCESSING'
    });

    if (errors || !data) {
      throw new Error('Failed to update order status');
    }

    // Real implementation
    try {
      const { body } = await post({
        apiName: 'payment-api',
        path: 'create-payment-intent',
        options: {
          body: params,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      }).response;

      return body as unknown as CreatePaymentIntentResponse;
    } catch (error) {
      // Log the full error object
      console.error('Payment API request failed - Full error:', error);
      console.error('Payment API request failed - Details:', {
        status: (error as any)?.response?.status,
        message: (error as any)?.message,
        response: (error as any)?.response,
        body: params // Log what we're sending
      });
      throw error;
    }
  } catch (error) {
    console.error('Payment intent request failed:', error);
    throw error;
  }
} 