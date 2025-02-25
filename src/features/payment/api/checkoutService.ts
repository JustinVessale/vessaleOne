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
    if (!params.orderId) {
      throw new Error('No order ID provided');
    }

    console.log('Creating payment intent for order:', params);

    if (MOCK_API) {
      console.log('Using mock payment API');
      return mockCreatePaymentIntent(params);
    }

    console.log('Using Real API');
    
    // Fetch the order to verify it exists and has the correct total
    const { data: orderData, errors: orderErrors } = await client.models.Order.get(
      { id: params.orderId },
      { selectionSet: ['id', 'total', 'items.*'] }
    );
    
    if (orderErrors || !orderData) {
      console.error('Failed to fetch order:', orderErrors);
      throw new Error('Failed to fetch order');
    }
    
    console.log('Order data before payment:', orderData);
    
    // Verify the order total matches the payment amount
    if (orderData.total !== params.total) {
      console.warn(`Order total (${orderData.total}) doesn't match payment amount (${params.total})`);
    }

    const { data, errors } = await client.models.Order.update({
      id: params.orderId,
      stripePaymentIntentId: 'pending',
      status: 'PAYMENT_PROCESSING'
    });

    if (errors || !data) {
      console.error('Failed to update order status:', errors);
      throw new Error('Failed to update order status');
    }

    try {
      console.log('Making payment API request with params:', params);
      
      const response = await post({
        apiName: 'payment-api',
        path: 'create-payment-intent', // Remove leading slash
        options: {
          body: params,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      }).response;

      const responseData = await response.body.json() as CreatePaymentIntentResponse;
      console.log('Payment intent created successfully:', responseData);

      if (!responseData.clientSecret) {
        throw new Error('No client secret received from payment API');
      }

      return {
        clientSecret: responseData.clientSecret,
        orderId: responseData.orderId
      };
    } catch (error) {
      console.error('Payment API request failed:', error);
      if (error instanceof Error) {
        throw new Error(`Payment API error: ${error.message}`);
      }
      throw error;
    }
  } catch (error) {
    console.error('Payment intent creation failed:', error);
    throw error;
  }
} 