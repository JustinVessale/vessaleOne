import { Webhook } from 'svix';
import { createClient } from './client';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

// Define types for Nash webhook data
interface NashWebhookData {
  type: string;
  event: string;
  data?: {
    id?: string;
    portalUrl?: string;
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

// Update the webhook secret line to check both environment variable names
const NASH_WEBHOOK_SECRET = process.env.NASH_WEBHOOK_SECRET || '';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Received webhook event:', JSON.stringify(event));
    
    // Check if environment variables are set
    if (!NASH_WEBHOOK_SECRET) {
      console.error('NASH_WEBHOOK_SECRET environment variable is not set');
    }
    
    // Parse the request body
    const body = event.body;
    const parsedBody = typeof body === 'string' ? body : JSON.stringify(body);
    const headers = event.headers || {};
    
    // Convert headers to lowercase for consistency
    const normalizedHeaders: Record<string, string> = Object.keys(headers).reduce((acc, key) => {
      acc[key.toLowerCase()] = headers[key] as string;
      return acc;
    }, {} as Record<string, string>);
    
    // Verify the webhook signature
    if (NASH_WEBHOOK_SECRET) {
      try {
        const wh = new Webhook(NASH_WEBHOOK_SECRET);
        const payload = wh.verify(parsedBody, {
          'svix-id': normalizedHeaders['svix-id'],
          'svix-timestamp': normalizedHeaders['svix-timestamp'],
          'svix-signature': normalizedHeaders['svix-signature']
        });
        
        console.log('Webhook signature verified:', payload);
      } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return {
          statusCode: 401,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ error: 'Invalid signature' })
        };
      }
    } else {
      console.warn('NASH_WEBHOOK_SECRET not configured, skipping signature verification');
    }

    // Parse the webhook data
    const data: NashWebhookData = JSON.parse(parsedBody);
    console.log('Nash webhook received:', data);

    // Extract the webhook type and event
    const webhookType = data.type; // 'delivery', 'task', or 'courier_location'
    const webhookEvent = data.event; // specific event within the type
    
    // For delivery events, the order ID is in data.data.id
    const nashOrderId = data.data?.id;

    if (!nashOrderId) {
      console.error('No order ID in webhook payload');
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Missing order ID' })
      };
    }

    // Initialize Amplify client
    const client = createClient();

    // Find the order in our database that has this Nash order ID
    // Note: With Amplify Gen 2, we can't directly filter on nested fields,
    // so we need to get all orders and filter them in memory
    const { data: orders, errors } = await client.models.Order.list({});

    if (errors) {
      console.error('Error fetching orders:', errors);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Failed to fetch orders' })
      };
    }

    // Find the order with the matching Nash order ID
    const matchingOrders = orders?.filter(order => 
      order.deliveryInfo?.deliveryId === nashOrderId
    ) || [];

    if (!matchingOrders.length) {
      console.warn(`No order found with Nash order ID: ${nashOrderId}`);
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: 'Order not found' })
      };
    }

    const order = matchingOrders[0];
    
    // Process the webhook based on type and event
    if (webhookType === 'delivery') {
      // Handle delivery events
      await processDeliveryEvent(client, order, webhookEvent, data);
    } else if (webhookType === 'courier_location' && webhookEvent === 'updated') {
      // Handle courier location updates
      await processCourierLocationUpdate(client, order, data);
    } else {
      console.log(`Unhandled Nash webhook type: ${webhookType}, event: ${webhookEvent}`);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ success: true })
    };
  } catch (err) {
    console.error('Error processing Nash webhook:', err);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Failed to process webhook' })
    };
  }
};

// Helper function to process delivery events
async function processDeliveryEvent(
  client: ReturnType<typeof createClient>, 
  order: any, // Using any for now to avoid type errors with the Amplify client
  webhookEvent: string, 
  data: NashWebhookData
) {
  // Map Nash event to our delivery status
  const deliveryStatus = mapNashEventToDeliveryStatus(webhookEvent);
  const orderStatus = mapDeliveryStatusToOrderStatus(deliveryStatus);
  
  // Get delivery details from the webhook payload
  const delivery = data.data?.jobConfigurations?.[0]?.tasks?.[0]?.delivery;
  
  // Update the order with the new status and delivery details
  const updateResult = await client.models.Order.update({
    id: order.id,
    status: orderStatus,
    deliveryInfo: {
      deliveryId: order.deliveryInfo?.deliveryId || '',
      provider: 'Nash',
      status: deliveryStatus,
      quoteId: order.deliveryInfo?.quoteId || '',
      fee: order.deliveryInfo?.fee || 0,
      estimatedPickupTime: delivery?.pickupEta || order.deliveryInfo?.estimatedPickupTime || new Date().toISOString(),
      estimatedDeliveryTime: delivery?.dropoffEta || order.deliveryInfo?.estimatedDeliveryTime || new Date(Date.now() + 30 * 60000).toISOString(),
      trackingUrl: data.data?.portalUrl || order.deliveryInfo?.trackingUrl || ''
    }
  });
  
  console.log('Order update result:', updateResult);
  
  // If driver information is available, update it
  if (delivery?.courierName && delivery?.courierPhoneNumber) {
    await client.models.Order.update({
      id: order.id,
      driver: {
        id: delivery.id || 'unknown',
        name: delivery.courierName || 'Unknown Driver',
        phone: delivery.courierPhoneNumber || '',
        currentLocation: delivery.courierLocation || null
      }
    });
  }
}

// Helper function to process courier location updates
async function processCourierLocationUpdate(
  client: ReturnType<typeof createClient>, 
  order: any, // Using any for now to avoid type errors with the Amplify client
  data: NashWebhookData
) {
  const location = data.data?.jobConfigurations?.[0]?.tasks?.[0]?.delivery?.courierLocation;
  
  if (location) {
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
  }
}

// Helper function to map Nash event to our DeliveryStatus enum
function mapNashEventToDeliveryStatus(nashEvent: string): DeliveryStatus {
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
      return 'PREPARING';
  }
} 