import { Webhook } from 'svix';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource.js';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/nash-webhook.js';

// Define types for Nash webhook data
interface NashWebhookData {
  type: string;
  event: string;
  data?: {
    id?: string;
    portalUrl?: string;
    publicTrackingUrl?: string;
    externalIdentifier?: string;
    jobMetadata?: {
      nash_order_id?: string;
    };
    jobConfigurations?: Array<{
      tasks?: Array<{
        delivery?: {
          id?: string;
          pickupEta?: string;
          dropoffEta?: string;
          courierName?: string;
          courierPhoneNumber?: string;
          courierLocation?: {
            lat: number;
            lng: number;
          };
        };
      }>;
    }>;
  };
}

// Define types based on the Amplify schema
type OrderStatus = 'PENDING' | 'PAYMENT_PROCESSING' | 'PAID' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED' | null;
type DeliveryStatus = 'PENDING' | 'CONFIRMED' | 'PICKING_UP' | 'PICKED_UP' | 'DELIVERING' | 'COMPLETED' | 'CANCELLED' | 'FAILED' | null;

interface OrderDriver {
  id: string;
  name: string;
  phone: string;
  currentLocation: {
    lat: number;
    lng: number;
  } | null;
}

interface DeliveryInfo {
  deliveryId: string;
  provider: string;
  status: DeliveryStatus;
  quoteId?: string;
  fee?: number;
  estimatedPickupTime?: string;
  estimatedDeliveryTime?: string;
  trackingUrl?: string;
}

interface Order {
  id: string;
  status: OrderStatus;
  deliveryInfo?: DeliveryInfo;
  driver?: OrderDriver;
}

// Get the webhook secret from environment variable
const NASH_WEBHOOK_SECRET = process.env.NASH_WEBHOOK_SECRET || '';

// Initialize client outside the handler for reuse across invocations
let client: ReturnType<typeof generateClient<Schema>>;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Initialize Amplify and client if not already done
    if (!client) {
      const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
      Amplify.configure(resourceConfig, libraryOptions);
      client = generateClient<Schema>();
      console.log('Amplify client initialized');
    }
    
    console.log('Received webhook event:', JSON.stringify(event));
    
    // Check if environment variables are set
    if (!NASH_WEBHOOK_SECRET) {
      console.error('NASH_WEBHOOK_SECRET environment variable is not set');
    }
    
    // Parse the request body
    const body = event.body;
    
    if (!body) {
      console.error('Request body is empty');
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Request body is empty' })
      };
    }
    
    const parsedBody = typeof body === 'string' ? body : JSON.stringify(body);
    const headers = event.headers || {};
    
    console.log('Request headers:', JSON.stringify(headers));
    console.log('Request body:', parsedBody.length > 1000 ? parsedBody.substring(0, 1000) + '...' : parsedBody);
    
    // Convert headers to lowercase for consistency
    const normalizedHeaders: Record<string, string> = Object.keys(headers).reduce((acc, key) => {
      acc[key.toLowerCase()] = headers[key] as string;
      return acc;
    }, {} as Record<string, string>);
    
    // Log the normalized headers for debugging
    console.log('Normalized headers:', JSON.stringify(normalizedHeaders));
    
    // Verify the webhook signature if the secret is provided
    if (NASH_WEBHOOK_SECRET) {
      try {
        const svixId = normalizedHeaders['svix-id'] || normalizedHeaders['x-svix-id'];
        const svixTimestamp = normalizedHeaders['svix-timestamp'] || normalizedHeaders['x-svix-timestamp'];
        const svixSignature = normalizedHeaders['svix-signature'] || normalizedHeaders['x-svix-signature'];
        
        if (!svixId || !svixTimestamp || !svixSignature) {
          console.warn('Missing one or more Svix headers, skipping signature verification');
        } else {
          const wh = new Webhook(NASH_WEBHOOK_SECRET);
          const payload = wh.verify(parsedBody, {
            'svix-id': svixId,
            'svix-timestamp': svixTimestamp,
            'svix-signature': svixSignature
          });
          
          console.log('Webhook signature verified');
        }
      } catch (err) {
        console.error('Webhook signature verification failed:', err);
        // Continue processing despite signature verification failure for testing
        console.warn('Continuing with processing despite signature failure for testing purposes');
      }
    } else {
      console.warn('NASH_WEBHOOK_SECRET not configured, skipping signature verification');
    }

    // Parse the webhook data
    let data: NashWebhookData;
    try {
      data = JSON.parse(parsedBody);
    } catch (error) {
      console.error('Failed to parse webhook data:', error);
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    // Extract the webhook type and event
    const webhookType = data.type;
    const webhookEvent = data.event;
    
    
    // Only use externalIdentifier for Nash order ID
    const nashOrderId = data.data?.externalIdentifier;

    if (!nashOrderId) {
      console.error('No externalIdentifier found in webhook payload');
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Missing externalIdentifier in webhook payload' })
      };
    }

    console.log('Using Nash order ID from externalIdentifier:', nashOrderId);

    // Find the order in our database that has this Nash order ID
    let orders, errors;
    try {
      ({ data: orders, errors } = await client.models.Order.list({}));
    } catch (error) {
      console.error('Error fetching orders:', error);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Failed to fetch orders: ' + error })
      };
    }

    if (errors) {
      console.error('GraphQL errors when fetching orders:', errors);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'GraphQL errors when fetching orders' })
      };
    }

    console.log(`Fetched ${orders?.length || 0} orders from database`);

    // Find the order with the matching Nash order ID in the order.id field
    const matchingOrder = orders?.find(order => order.id === nashOrderId);

    if (!matchingOrder) {
      console.error(`No order found with Nash order ID: ${nashOrderId}`);
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: `No order found with externalIdentifier: ${nashOrderId}` })
      };
    }

    console.log('Found matching order:', matchingOrder.id);
    
    // Process the webhook based on type and event
    try {
      if (webhookType === 'delivery') {
        await processDeliveryEvent(client, matchingOrder, webhookEvent, data);
      } else if (webhookType === 'courier_location' && webhookEvent === 'updated') {
        // Handle courier location updates
        await processCourierLocationUpdate(client, matchingOrder, data);
      } else if (webhookType === 'job') {
        // Handle job events which include the portal URL
        await processJobEvent(client, matchingOrder, webhookEvent, data);
      } else {
        console.log(`Unhandled Nash webhook type: ${webhookType}, event: ${webhookEvent}`);
      }
      
      console.log(`Successfully processed ${webhookType} event: ${webhookEvent}`);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ success: true })
      };
    } catch (error: any) {
      console.error('Error processing webhook event:', error);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: `Error processing webhook event: ${error.message}` })
      };
    }
  } catch (err: any) {
    console.error('Error processing Nash webhook:', err);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: `Failed to process webhook: ${err.message}` })
    };
  }
};

// Helper function to process job events
async function processJobEvent(
  client: ReturnType<typeof generateClient<Schema>>, 
  order: any, // Using any for now to avoid type errors with the Amplify client
  webhookEvent: string,
  data: NashWebhookData
) {
  
  // Extract portal URL and public tracking URL from the data
  const portalUrl = data.data?.portalUrl;
  const publicTrackingUrl = data.data?.publicTrackingUrl;
  const trackingUrl = publicTrackingUrl || portalUrl;
  
  
  if (trackingUrl) {
    // Update the order with the tracking URL;
    
    const updateResult = await client.models.Order.update({
      id: order.id,
      deliveryInfo: {
        ...order.deliveryInfo,
        trackingUrl
      }
    });
    
    console.log('Order update result:', JSON.stringify(updateResult));
  }
}

// Helper function to process delivery events
async function processDeliveryEvent(
  client: ReturnType<typeof generateClient<Schema>>, 
  order: any, // Using any for now to avoid type errors with the Amplify client
  webhookEvent: string, 
  data: NashWebhookData
) {
  console.log('Processing delivery event:', webhookEvent);
  
  // Map Nash event to our delivery status
  const deliveryStatus = mapNashEventToDeliveryStatus(webhookEvent);
  const orderStatus = mapDeliveryStatusToOrderStatus(deliveryStatus);
  
  console.log(`Mapped to delivery status: ${deliveryStatus}, order status: ${orderStatus}`);
  
  // Get delivery details from the webhook payload
  const delivery = data.data?.jobConfigurations?.[0]?.tasks?.[0]?.delivery;
  
  // Get the tracking URL - prefer public tracking URL over portal URL
  const portalUrl = data.data?.portalUrl;
  const publicTrackingUrl = data.data?.publicTrackingUrl;
  const trackingUrl = publicTrackingUrl || portalUrl || order.deliveryInfo?.trackingUrl;
  // Prepare the updated delivery info
  const updatedDeliveryInfo = {
    deliveryId: order.deliveryInfo?.deliveryId || '',
    provider: 'Nash',
    status: deliveryStatus,
    quoteId: order.deliveryInfo?.quoteId || '',
    fee: order.deliveryInfo?.fee || 0,
    estimatedPickupTime: delivery?.pickupEta || order.deliveryInfo?.estimatedPickupTime || new Date().toISOString(),
    estimatedDeliveryTime: delivery?.dropoffEta || order.deliveryInfo?.estimatedDeliveryTime || new Date(Date.now() + 30 * 60000).toISOString(),
    trackingUrl: trackingUrl || ''
  };
  
  console.log('Updated delivery info:', updatedDeliveryInfo);
  
  // Update the order with the new status and delivery details
  try {
    const updateResult = await client.models.Order.update({
      id: order.id,
      status: orderStatus,
      deliveryInfo: updatedDeliveryInfo
    });
    
    console.log('Order update result:', JSON.stringify(updateResult));
  } catch (error) {
    console.error('Error updating order with delivery info:', error);
    throw error;
  }
  
  // If driver information is available, update it
  if (delivery?.courierName && delivery?.courierPhoneNumber) {
    console.log('Updating driver information');
    try {
      await client.models.Order.update({
        id: order.id,
        driver: {
          id: delivery.id || 'unknown',
          name: delivery.courierName || 'Unknown Driver',
          phone: delivery.courierPhoneNumber || '',
          currentLocation: delivery.courierLocation || null
        }
      });
      console.log('Driver information updated successfully');
    } catch (error) {
      console.error('Error updating driver information:', error);
      throw error;
    }
  }
}

// Helper function to process courier location updates
async function processCourierLocationUpdate(
  client: ReturnType<typeof generateClient<Schema>>, 
  order: any, // Using any for now to avoid type errors with the Amplify client
  data: NashWebhookData
) {
  console.log('Processing courier location update');
  
  const location = data.data?.jobConfigurations?.[0]?.tasks?.[0]?.delivery?.courierLocation;
  
  if (location) {
    console.log('Updating driver location:', location);
    
    try {
      await client.models.Order.update({
        id: order.id,
        driver: {
          ...order.driver,
          currentLocation: {
            lat: location.lat,
            lng: location.lng
          }
        }
      });
      console.log('Driver location updated successfully');
    } catch (error) {
      console.error('Error updating driver location:', error);
      throw error;
    }
  } else {
    console.log('No location data found in courier_location update');
  }
}

// Helper function to map Nash event to our DeliveryStatus enum
function mapNashEventToDeliveryStatus(nashEvent: string): DeliveryStatus {
  console.log('Mapping Nash event to delivery status:', nashEvent);
  //TODO need to check that these events are correct for our statuses.
  switch (nashEvent) {
    case 'created':
      return 'PENDING';
    case 'assigned_driver':
      return 'CONFIRMED';
    case 'pickup_enroute':
    case 'pickup_arrived':
      return 'PICKING_UP';
    case 'pickup_complete':
    case 'dropoff_enroute':
      return 'PICKED_UP';
    case 'dropoff_arrived':
      return 'DELIVERING';
    case 'dropoff_complete':
      return 'COMPLETED';
    case 'canceled_by_provider':
    case 'canceled_by_customer':
    case 'canceled_by_nash':
      return 'CANCELLED';
    case 'failed':
      return 'FAILED';
    default:
      return 'PENDING';
  }
}

// Helper function to map DeliveryStatus to OrderStatus
function mapDeliveryStatusToOrderStatus(deliveryStatus: DeliveryStatus): OrderStatus {

  switch (deliveryStatus) {
    case 'PENDING':
    case 'CONFIRMED':
    case 'PICKING_UP':
      return 'PREPARING';
    case 'PICKED_UP':
    case 'DELIVERING':
      return 'PREPARING';
    case 'COMPLETED':
      return 'COMPLETED';
    case 'CANCELLED':
    case 'FAILED':
      return 'CANCELLED';
    default:
      return 'CANCELLED';
  }
} 