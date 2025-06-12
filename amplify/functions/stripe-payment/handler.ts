import type { APIGatewayProxyHandler } from "aws-lambda";
import Stripe from 'stripe';
import { generateClient } from 'aws-amplify/data';
import { Amplify } from 'aws-amplify';
import type { Schema } from '../../data/resource.js';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/stripe-payment.js';
import { generateClient as apiGenerateClient } from 'aws-amplify/api';

// Initialize Stripe client using env object
const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-04-30.basil'
});

// Initialize Amplify using the official pattern
const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);

Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>();

// Platform configuration
const PLATFORM_CONFIG = {
  SERVICE_FEE_CENTS: 229, // $2.29 in cents for Stripe
  PROCESSING_FEE_PERCENTAGE: 0.029, // 2.9% processing fee on total order amount
} as const;

// Helper function to determine the appropriate origin for CORS
const getAllowedOrigin = (origin?: string): string => {
  console.log('origin', origin);
  
  // If no origin provided, return an empty string (disables CORS)
  if (!origin) {
    console.log('no origin provided');
    return '*'; // Allow any origin as fallback
  }
  
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://develop.d2g0w15slq5y17.amplifyapp.com',
    'https://main.d2g0w15slq5y17.amplifyapp.com',
    'https://thevessale.com',
    'https://www.thevessale.com',
    'https://orderthevessale.com',
    'https://www.orderthevessale.com'
  ];
  
  // If the origin is in our allowed list, return it
  if (allowedOrigins.includes(origin)) {
    return origin;
  }
  
  // Otherwise check if it matches our amplifyapp.com pattern
  if (/^https:\/\/.*\.amplifyapp\.com$/.test(origin)) {
    return origin;
  }
  
  // Return the actual origin if nothing else matches - this is more secure than a wildcard
  console.log('returning original origin');
  return origin;
};

export const handler: APIGatewayProxyHandler = async (event) => {
  // Set up CORS headers
  const headers = {
    'Access-Control-Allow-Origin': getAllowedOrigin(event.headers.origin),
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,stripe-signature',
  };

  try {
    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: '',
      };
    }

    // Check if this is a request to create a checkout session
    const path = event.path || '';
    const isCreateCheckoutSession = path.endsWith('/create-checkout-session');

    // Parse the request body
    const body = JSON.parse(event.body || '{}');
    
    if (isCreateCheckoutSession) {
      // Handle create-checkout-session request
      const { orderId, restaurantId } = body;
      
      if (!orderId || !restaurantId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Missing required parameters: orderId and restaurantId are required' 
          }),
        };
      }

      console.log(`Creating checkout session for order ${orderId} and restaurant ${restaurantId}`);
      
      // Get the order details from the database
      const { data: order, errors: orderErrors } = await client.models.Order.get({
        id: orderId
      });

      if (orderErrors || !order) {
        console.error('Failed to fetch order:', orderErrors);
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Failed to fetch order' }),
        };
      }

      // Get restaurant details to get their Stripe account
      const { data: restaurant, errors: restaurantErrors } = await client.models.Restaurant.get({
        id: restaurantId
      });

      if (restaurantErrors || !restaurant) {
        console.error('Failed to fetch restaurant:', restaurantErrors);
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Failed to fetch restaurant' }),
        };
      }

      if (!restaurant.stripeAccountId) {
        console.error('Restaurant has no Stripe account connected');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Restaurant has not connected their Stripe account' }),
        };
      }

      // Get the order items with menu items
      const { data: orderItems, errors: itemsErrors } = await client.models.OrderItem.list({
        filter: {
          orderId: { eq: orderId }
        }
      });

      if (itemsErrors || !orderItems || orderItems.length === 0) {
        console.error('Failed to fetch order items:', itemsErrors);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Failed to fetch order items' }),
        };
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
      const lineItems = menuItems.map((item) => {
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
              description: "Fee for delivery of your order",
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
      const baseUrl = process.env.APP_URL || 'http://localhost:5173';
      
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
        console.error('Failed to update order with checkout session:', updateErrors);
        // Continue anyway since the checkout session was created
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          sessionId: session.id,
          url: session.url,
        }),
      };
    } else {
      // Handle webhook events
      const { type } = body;

      switch (type) {
        case 'checkout.session.completed':
        case 'checkout.session.async_payment_succeeded':
        case 'checkout.session.expired':
        case 'checkout.session.async_payment_failed':
          // These events are handled by the Next.js webhook handler
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ received: true }),
          };

        default:
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Unhandled event type' }),
          };
      }
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }),
    };
  }
};