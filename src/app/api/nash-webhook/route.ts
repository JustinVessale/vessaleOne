import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { generateServerClient } from '@/lib/amplify-utils';

// Nash webhook secret - should be stored in environment variables
const NASH_WEBHOOK_SECRET = process.env.NASH_WEBHOOK_SECRET || '';

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = (await headers()).get('x-nash-signature') || '';

    // Verify webhook signature (implementation depends on Nash's signature method)
    // This is a placeholder - you'll need to implement proper signature verification
    if (!verifySignature(body, signature)) {
      console.error('Nash webhook signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const data = JSON.parse(body);
    console.log('Nash webhook received:', data);

    // Process different webhook event types
    const eventType = data.type;
    const orderId = data.order?.id;

    if (!orderId) {
      console.error('No order ID in webhook payload');
      return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });
    }

    const client = generateServerClient();

    // Find the order in our database that has this Nash order ID
    const { data: orders } = await client.models.Order.list({
      filter: {
        // We need to use a different approach to find the order
        // Since we can't directly filter on nested fields in Amplify Gen 2
        // We'll get all orders and filter them in memory
      }
    });

    // Find the order with the matching Nash order ID
    const matchingOrders = orders?.filter(order => 
      order.deliveryInfo?.deliveryId === orderId
    ) || [];

    if (!matchingOrders.length) {
      console.warn(`No order found with Nash order ID: ${orderId}`);
      return NextResponse.json({ message: 'Order not found' }, { status: 200 });
    }

    const order = matchingOrders[0];
    
    // Update the delivery info based on the webhook event
    switch (eventType) {
      case 'order.status.updated':
        // Update order status
        const nashStatus = data.order.status;
        
        // Map Nash status to our order status if needed
        let orderStatus = order.status;
        if (nashStatus === 'DROPOFF_COMPLETE') {
          orderStatus = 'COMPLETED';
        } else if (nashStatus === 'CANCELLED' || nashStatus === 'FAILED') {
          orderStatus = 'CANCELLED';
        }
        
        // Update the order with the new status and delivery details
        await client.models.Order.update({
          id: order.id,
          status: orderStatus,
          deliveryInfo: {
            deliveryId: orderId,
            provider: 'Nash',
            status: mapNashStatusToDeliveryStatus(nashStatus) as any, // Use type assertion for now
            quoteId: order.deliveryInfo?.quoteId || '',
            fee: order.deliveryInfo?.fee || 0,
            estimatedPickupTime: order.deliveryInfo?.estimatedPickupTime || new Date().toISOString(),
            estimatedDeliveryTime: order.deliveryInfo?.estimatedDeliveryTime || new Date(Date.now() + 30 * 60000).toISOString(),
            trackingUrl: data.order.publicTrackingUrl || order.deliveryInfo?.trackingUrl || ''
          }
        });
        break;
        
      case 'delivery.driver.assigned':
        // Update driver information
        // Since we can't store driver info in deliveryInfo directly,
        // we'll update the driver field in the Order model
        await client.models.Order.update({
          id: order.id,
          driver: {
            id: data.delivery?.driver?.id || 'unknown',
            name: data.delivery?.driver?.name || 'Unknown Driver',
            phone: data.delivery?.driver?.phone || '',
            currentLocation: data.delivery?.driver?.location || null
          }
        });
        break;
        
      case 'delivery.location.updated':
        // Update driver location
        if (data.delivery?.location) {
          await client.models.Order.update({
            id: order.id,
            driver: {
              ...order.driver,
              currentLocation: {
                lat: data.delivery.location.lat,
                lng: data.delivery.location.lng
              }
            }
          });
        }
        break;
        
      default:
        console.log(`Unhandled Nash webhook event type: ${eventType}`);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error processing Nash webhook:', err);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

// Helper function to map Nash status to our DeliveryStatus enum
function mapNashStatusToDeliveryStatus(nashStatus: string): string {
  switch (nashStatus) {
    case 'CREATED':
    case 'QUOTES_AVAILABLE':
    case 'QUOTE_SELECTED':
      return 'PENDING';
    case 'DISPATCHED':
      return 'CONFIRMED';
    case 'ACTIVE':
      return 'PICKING_UP';
    case 'PICKUP_ARRIVED':
    case 'PICKUP_COMPLETE':
      return 'PICKED_UP';
    case 'DROPOFF_ARRIVED':
      return 'DELIVERING';
    case 'DROPOFF_COMPLETE':
      return 'COMPLETED';
    case 'CANCELLED':
      return 'CANCELLED';
    case 'FAILED':
      return 'FAILED';
    default:
      return 'PENDING';
  }
}

// Placeholder function for signature verification
// You'll need to implement this based on Nash's signature method
function verifySignature(payload: string, signature: string): boolean {
  // This is a placeholder - implement proper signature verification
  // based on Nash's documentation
  if (!NASH_WEBHOOK_SECRET) {
    console.warn('NASH_WEBHOOK_SECRET not configured, skipping signature verification');
    return true;
  }
  
  // Implement proper signature verification here
  return true;
} 