import { generateClient } from 'aws-amplify/api';
import { post } from 'aws-amplify/api';
import type { Schema } from '../../../../amplify/data/resource';
import { autodispatchOrder } from '@/lib/services/nashService';

const client = generateClient<Schema>();

const MOCK_API = import.meta.env.VITE_USE_MOCK_PAYMENT_API === 'true';
const MOCK_DELAY = 1000; // Simulate network delay

type CreatePaymentIntentParams = {
  orderId: string;
  total: number;
  restaurantId: string;
  nashOrderId?: string; // Add nashOrderId parameter
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
      { selectionSet: ['id', 'total', 'isDelivery', 'deliveryFee', 'items.*'] }
    );
    
    if (orderErrors || !orderData) {
      console.error('Failed to fetch order:', orderErrors);
      throw new Error('Failed to fetch order');
    }
    
    console.log('Order data before payment:', orderData);
    
    // Calculate the correct total by adding the subtotal and delivery fee
    const correctTotal = orderData.isDelivery 
      ? (params.total + (orderData.deliveryFee || 0)) 
      : params.total;
    
    // Update the params with the correct total
    // Convert to a clean number with exactly 2 decimal places to avoid floating-point precision issues
    params.total = parseFloat((Math.round(correctTotal * 100) / 100).toFixed(2));
    
    console.log(`Calculated total for payment: ${params.total} (includes delivery fee: ${orderData.deliveryFee || 0})`);

    const { data, errors } = await client.models.Order.update({
      id: params.orderId,
      stripePaymentIntentId: 'pending',
      status: 'PAYMENT_PROCESSING',
      // Also update the order total to ensure it includes the delivery fee
      total: params.total
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