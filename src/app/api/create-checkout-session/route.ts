import { NextResponse } from 'next/server';
import { generateServerClient } from '@/lib/amplify-utils';
import { createStripe } from '@/config/stripe';
import Stripe from 'stripe';

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

    if (itemsErrors || !orderItems) {
      throw new Error('Failed to fetch order items');
    }

    // Create line items from order items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = await Promise.all(
      orderItems.map(async (item) => {
        if (!item.menuItemId) {
          throw new Error('Order item missing menuItemId');
        }

        const { data: menuItem } = await client.models.MenuItem.get({
          id: item.menuItemId
        });

        return {
          price_data: {
            currency: 'usd',
            product_data: {
              name: menuItem?.name || 'Item',
              description: menuItem?.description || undefined,
            },
            unit_amount: Math.round((menuItem?.price || 0) * 100), // Convert to cents
          },
          quantity: item.quantity || 1,
        };
      })
    );

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

    // Construct success and cancel URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const successUrl = new URL('/order/success', baseUrl);
    const cancelUrl = new URL('/order/cancel', baseUrl);
    
    // Add query parameters
    successUrl.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}');
    successUrl.searchParams.set('order_id', orderId);

    // Create the checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: successUrl.toString(),
      cancel_url: cancelUrl.toString(),
      customer_email: order.customerEmail || undefined,
      metadata: {
        orderId,
        restaurantId,
      },
      payment_intent_data: {
        transfer_data: {
          destination: restaurant.stripeAccountId,
        },
        application_fee_amount: 199, // $1.99 in cents
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