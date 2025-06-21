import { NextResponse } from 'next/server';
import { generateServerClient } from '@/lib/amplify-utils';
import { createStripe } from '@/config/stripe';
import Stripe from 'stripe';
import { PLATFORM_CONFIG } from '@/config/constants';

// Helper to add CORS headers
function withCORS(response: Response) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,stripe-signature');
  return response;
}

export async function OPTIONS() {
  // Preflight CORS support
  return withCORS(new Response(null, { status: 200 }));
}

export async function POST(request: Request) {
  try {
    const { orderId, restaurantId } = await request.json();
    const stripe = createStripe();
    
    // Get the order details from the database
    const client = generateServerClient();
    const { data: order, errors: orderErrors } = await client.models.Order.get({
      id: orderId
    });

    if (orderErrors || !order) {
      throw new Error('Failed to fetch order');
    }

    // Get restaurant details to get their Stripe account
    const { data: restaurant, errors: restaurantErrors } = await client.models.Restaurant.get({
      id: restaurantId
    });

    if (restaurantErrors || !restaurant) {
      throw new Error('Failed to fetch restaurant');
    }

    if (!restaurant.stripeAccountId) {
      throw new Error('Restaurant has not connected their Stripe account');
    }

    // Get the order items with menu items
    const { data: orderItems, errors: itemsErrors } = await client.models.OrderItem.list({
      filter: {
        orderId: { eq: orderId }
      }
    });

    console.log('Order items query result:', { orderItems, itemsErrors, orderId });

    if (itemsErrors || !orderItems) {
      console.error('Failed to fetch order items:', { itemsErrors, orderItems, orderId });
      throw new Error('Failed to fetch order items');
    }

    if (orderItems.length === 0) {
      console.error('No order items found for order:', orderId);
      throw new Error('No order items found for this order');
    }

    // Calculate the preliminary total to determine processing fee
    // First, get all menu items to calculate the items total
    const menuItems = await Promise.all(
      orderItems.map(async (item) => {
        if (!item.menuItemId) {
          throw new Error('Order item missing menuItemId');
        }
        const { data: menuItem } = await client.models.MenuItem.get({
          id: item.menuItemId
        });
        return {
          ...item,
          menuItem
        };
      })
    );
    
    // Calculate items total
    const itemsTotal = menuItems.reduce((sum, item) => {
      const menuItemPrice = item.menuItem?.price || 0;
      return sum + (menuItemPrice * (item.quantity || 1));
    }, 0);
    
    const deliveryFeeAmount = order.isDelivery && order.deliveryFee ? order.deliveryFee : 0;
    const serviceFeeAmount = PLATFORM_CONFIG.SERVICE_FEE_CENTS / 100; // Convert to dollars
    const preliminaryTotal = itemsTotal + deliveryFeeAmount + serviceFeeAmount;
    
    // Calculate 2.9% processing fee based on the preliminary total
    const processingFeeAmount = preliminaryTotal * PLATFORM_CONFIG.PROCESSING_FEE_PERCENTAGE;

    // Create line items from order items (reuse the menu items we already fetched)
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = menuItems.map((item) => {
      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.menuItem?.name || 'Item',
            description: item.menuItem?.description || undefined,
          },
          unit_amount: Math.round((item.menuItem?.price || 0) * 100), // Convert to cents
        },
        quantity: item.quantity || 1,
      };
    });

    // Add delivery fee if applicable
    if (order.isDelivery && order.deliveryFee) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Delivery Fee',
          },
          unit_amount: Math.round(order.deliveryFee * 100),
        },
        quantity: 1,
      });
    }

    // Add platform service fee as a visible line item
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Service Fee',
          description: 'Platform service fee',
        },
        unit_amount: PLATFORM_CONFIG.SERVICE_FEE_CENTS,
      },
      quantity: 1,
    });

    // Add processing fee as a visible line item
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Processing Fee',
          description: '2.9% processing fee',
        },
        unit_amount: Math.round(processingFeeAmount * 100), // Convert to cents
      },
      quantity: 1,
    });

    // Construct success and cancel URLs with restaurant context
    // Determine base URL based on environment
    let baseUrl: string;
    
    if (process.env.NODE_ENV === 'production') {
      // In production, use the production domain
      baseUrl = 'https://orderthevessale.com';
    } else if (process.env.VERCEL_ENV === 'preview') {
      // For preview deployments (like develop branch), use the develop domain
      baseUrl = 'https://develop.d2g0w15slq5y17.amplifyapp.com';
    } else {
      // For local development, use localhost
      baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5173';
    }
    
    // Get restaurant and location slugs for proper redirect
    let restaurantSlug = restaurant.slug;
    let locationSlug = null;
    
    // If order has a location, get the location slug
    if (order.locationId) {
      const { data: location } = await client.models.RestaurantLocation.get({
        id: order.locationId
      });
      locationSlug = location?.slug;
    }
    
    // Construct the redirect path based on whether we have a location
    const redirectPath = locationSlug 
      ? `/${restaurantSlug}/${locationSlug}/order/success`
      : `/${restaurantSlug}/order/success`;
    
    const cancelPath = locationSlug 
      ? `/${restaurantSlug}/${locationSlug}/order/cancel`
      : `/${restaurantSlug}/order/cancel`;
    
    // Build the URLs manually to avoid encoding issues with Stripe placeholders
    const successUrl = `${baseUrl}${redirectPath}?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`;
    const cancelUrl = `${baseUrl}${cancelPath}?order_id=${orderId}`;
    
    // Create the checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: order.customerEmail || undefined,
      metadata: {
        orderId,
        restaurantId,
      },
      payment_intent_data: {
        transfer_data: {
          destination: restaurant.stripeAccountId,
        },
        // Calculate application fee: service fee + delivery fee + processing fee (all go to platform)
        // Restaurant gets: items total only
        // We keep: service fee + delivery fee + processing fee (minus Stripe processing fees)
        // We'll handle paying Nash for delivery separately
        application_fee_amount: (() => {
          let totalPlatformFee = PLATFORM_CONFIG.SERVICE_FEE_CENTS; // Always include $2.29 service fee
          
          // Add delivery fee if this is a delivery order (Nash provides dynamic amount)
          if (order.isDelivery && order.deliveryFee) {
            const deliveryFeeCents = Math.round(order.deliveryFee * 100);
            totalPlatformFee += deliveryFeeCents;
            
            console.log(`Order ${orderId}: Adding delivery fee to platform: $${order.deliveryFee} (${deliveryFeeCents} cents)`);
          }
          
          // Add processing fee (now that customer is paying it as a line item)
          const processingFeeCents = Math.round(processingFeeAmount * 100);
          totalPlatformFee += processingFeeCents;
          
          console.log(`Order ${orderId}: Total platform fee breakdown:`);
          console.log(`- Service fee: $${PLATFORM_CONFIG.SERVICE_FEE_CENTS / 100} (${PLATFORM_CONFIG.SERVICE_FEE_CENTS} cents)`);
          console.log(`- Delivery fee: $${order.isDelivery && order.deliveryFee ? order.deliveryFee : 0}`);
          console.log(`- Processing fee (2.9%): $${processingFeeCents / 100} (${processingFeeCents} cents)`);
          console.log(`- Total platform fee: $${totalPlatformFee / 100} (${totalPlatformFee} cents)`);
          
          return totalPlatformFee;
        })(),
      },
      automatic_tax: {
        enabled: true,
      },
      // Add shipping address collection if delivery
      shipping_address_collection: order.isDelivery ? {
        allowed_countries: ['US'], // Add more countries as needed
      } : undefined,
      // Add phone number collection
      phone_number_collection: {
        enabled: true,
      },
    });

    // Update order with checkout session ID
    const { errors: updateErrors } = await client.models.Order.update({
      id: orderId,
      status: 'PAYMENT_PROCESSING',
      stripeCheckoutSessionId: session.id,
      updatedAt: new Date().toISOString()
    });

    if (updateErrors) {
      throw new Error('Failed to update order with checkout session');
    }

    const res = NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
    return withCORS(res);
  } catch (err) {
    console.error('Error:', err);
    const res = NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
    return withCORS(res);
  }
} 