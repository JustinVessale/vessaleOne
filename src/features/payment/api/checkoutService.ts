import { type Order } from '@/features/order/types';

type CreatePaymentIntentResponse = {
  clientSecret: string;
  paymentIntentId: string;
};

export async function createPaymentIntent(order: Order): Promise<CreatePaymentIntentResponse> {
  const response = await fetch('/api/create-payment-intent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(order),
  });

  if (!response.ok) {
    throw new Error('Failed to create payment intent');
  }

  return response.json();
} 