import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../../../amplify/data/resource';
import { autodispatchOrder } from '@/lib/services/nashService';

const client = generateClient<Schema>();

const MOCK_API = import.meta.env.VITE_USE_MOCK_PAYMENT_API === 'true';
const MOCK_DELAY = 1000; // Simulate network delay

type CreateCheckoutSessionParams = {
  orderId: string;
  restaurantId: string;
};

type CreateCheckoutSessionResponse = {
  sessionId: string;
  url: string;
};

async function mockCreateCheckoutSession(_params: CreateCheckoutSessionParams): Promise<CreateCheckoutSessionResponse> {
  return {
    sessionId: 'mock_session_id',
    url: 'https://checkout.stripe.com/mock',
  };
}

export async function createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CreateCheckoutSessionResponse> {
  if (process.env.NEXT_PUBLIC_USE_MOCK_API === 'true') {
    return mockCreateCheckoutSession(params);
  }

  const response = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create checkout session');
  }

  return response.json();
}

/**
 * Handle successful payment completion, including autodispatching Nash delivery if applicable
 */
export async function handlePaymentSuccess(
  orderId: string,
  nashOrderId?: string
): Promise<void> {
  try {
    console.log(`Payment successful for order ${orderId}`);
    
    // Fetch the order to check if it's a delivery order
    const { data: orderData, errors: getErrors } = await client.models.Order.get(
      { id: orderId }
    );
    
    if (getErrors || !orderData) {
      console.error('Failed to fetch order after payment:', getErrors);
      throw new Error('Failed to fetch order after payment');
    }
    
    // Update order status in database to PAID (not directly to PREPARING)
    const { data, errors } = await client.models.Order.update({
      id: orderId,
      status: 'PAID' // Always set to PAID first so restaurant can accept the order
    });
    
    if (errors || !data) {
      console.error('Failed to update order status after payment:', errors);
      throw new Error('Failed to update order status after payment');
    }
    
    // Only autodispatch if this is a delivery order and we have a Nash order ID
    if (orderData.isDelivery && nashOrderId) {
      console.log(`Autodispatching Nash order ${nashOrderId} for delivery`);
      try {
        const nashResponse = await autodispatchOrder(nashOrderId);
        console.log('Nash autodispatch response:', nashResponse);
        
        // Update order with Nash delivery information, but keep status as PAID
        await client.models.Order.update({
          id: orderId,
          deliveryInfo: {
            deliveryId: nashOrderId,
            provider: 'Nash',
            status: 'CONFIRMED',
            quoteId: orderData.deliveryInfo?.quoteId || '',
            fee: orderData.deliveryFee || 0,
            estimatedPickupTime: new Date().toISOString(),
            estimatedDeliveryTime: orderData.deliveryInfo?.estimatedDeliveryTime || new Date(Date.now() + 30 * 60000).toISOString(),
            trackingUrl: nashResponse.publicTrackingUrl || ''
          }
        });
        
        console.log('Order updated with delivery information, status remains PAID for restaurant acceptance');
      } catch (nashError) {
        console.error('Failed to autodispatch Nash order:', nashError);
        // We don't want to fail the entire payment process if Nash autodispatch fails
        // Just log the error and continue
      }
    } else if (!orderData.isDelivery) {
      console.log('Order is for pickup, status set to PAID for restaurant acceptance');
    }
  } catch (error) {
    console.error('Payment success handling failed:', error);
    throw error;
  }
} 