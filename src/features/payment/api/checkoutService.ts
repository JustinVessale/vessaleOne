import { generateClient } from 'aws-amplify/api';
import { post } from 'aws-amplify/api';
import type { Schema } from '../../../../amplify/data/resource';

const client = generateClient<Schema>();

type CreatePaymentIntentParams = {
  orderId: string;
  total: number;
  restaurantId: string;
};

type CreatePaymentIntentResponse = {
  clientSecret: string;
  orderId: string;
};

export async function createPaymentIntent(params: CreatePaymentIntentParams): Promise<CreatePaymentIntentResponse> {
  try {
    const { data, errors } = await client.models.Order.update({
      id: params.orderId,
      stripePaymentIntentId: 'pending',
      status: 'PAYMENT_PROCESSING'
    });

    if (errors || !data) {
      throw new Error('Failed to update order status');
    }

    // Call Stripe through Amplify API
    const { body } = await post({
      apiName: 'payment-api',
      path: '/create-payment-intent',
      options: {
        body: params
      }
    }).response;

    return body as unknown as CreatePaymentIntentResponse;
  } catch (error) {
    console.error('Payment intent request failed:', error);
    throw error;
  }
} 