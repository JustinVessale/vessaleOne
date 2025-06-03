'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../../amplify/data/resource';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/utils/currency';
import { format } from 'date-fns';
import { DeliveryTracking } from '@/features/delivery/components/DeliveryTracking';

const client = generateClient<Schema>();

type Order = {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  items: Array<{
    id: string;
    quantity: number;
    menuItem?: { name: string; price: number } | null;
    specialInstructions?: string | null;
  }>;
  isDelivery: boolean;
  deliveryFee: number;
  deliveryAddress?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  deliveryInfo?: {
    deliveryId: string;
    estimatedDeliveryTime: string;
  } | null;
  location?: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phoneNumber: string;
  } | null;
  restaurant?: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
  } | null;
};

export default function OrderSuccessPage() {
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const { restaurantSlug, locationSlug } = useParams<{ 
    restaurantSlug: string;
    locationSlug?: string;
  }>();
  const navigate = useNavigate();

  // Helper function to navigate back to restaurant
  const navigateToRestaurant = () => {
    if (restaurantSlug) {
      const path = locationSlug 
        ? `/${restaurantSlug}/${locationSlug}` 
        : `/${restaurantSlug}`;
      navigate(path);
    } else {
      navigate('/');
    }
  };

  useEffect(() => {
    async function fetchOrder() {
      try {
        const sessionId = searchParams.get('session_id');
        const orderId = searchParams.get('order_id');
        
        // If no session ID found or it's still the placeholder, try to use order_id
        if (!sessionId || sessionId === '{CHECKOUT_SESSION_ID}') {
          if (!orderId) {
            throw new Error('No session ID or order ID found');
          }
          
          // Fetch order directly by ID
          const { data: order, errors } = await client.models.Order.get(
            { id: orderId },
            { 
              selectionSet: [
              'id', 
              'status', 
              'total', 
              'createdAt', 
              'items.*', 
              'items.menuItem.*',
              'isDelivery',
              'deliveryFee',
              'deliveryAddress',
              'customerName',
              'customerPhone',
              'deliveryInfo.*',
              'locationId',
              'location.name',
              'location.address',
              'location.city',
              'location.state',
              'location.zip',
              'location.phoneNumber',
              'restaurantId',
              'restaurant.name',
              'restaurant.address',
              'restaurant.city',
              'restaurant.state',
              'restaurant.zip',
              'restaurant.phone'
            ] 
          }
          );

          if (errors || !order) {
            throw new Error('Order not found');
          }

          setOrder(order as Order);
          return;
        }

        // Find the order with this session ID
        const { data: orders, errors } = await client.models.Order.list({
          filter: {
            stripeCheckoutSessionId: {
              eq: sessionId
            }
          },
          selectionSet: [
            'id', 
            'status', 
            'total', 
            'createdAt', 
            'items.*', 
            'items.menuItem.*',
            'isDelivery',
            'deliveryFee',
            'deliveryAddress',
            'customerName',
            'customerPhone',
            'deliveryInfo.*',
            'locationId',
            'location.name',
            'location.address',
            'location.city',
            'location.state',
            'location.zip',
            'location.phoneNumber',
            'restaurantId',
            'restaurant.name',
            'restaurant.address',
            'restaurant.city',
            'restaurant.state',
            'restaurant.zip',
            'restaurant.phone'
          ]
        });

        if (errors || !orders.length) {
          throw new Error('Order not found');
        }

        setOrder(orders[0] as Order);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load order');
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrder();
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <span className="ml-2">Loading order details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="text-red-600 p-4 bg-red-50 rounded-md">
          <p className="font-medium">Error: {error}</p>
          <Button 
            onClick={() => navigateToRestaurant()}
            className="mt-2"
          >
            Return to Restaurant
          </Button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="text-red-600 p-4 bg-red-50 rounded-md">
          Order not found. Please contact support if you believe this is an error.
        </div>
      </div>
    );
  }

  // Get restaurant info from either location or restaurant property
  const restaurantName = order.location?.name || order.restaurant?.name || 'Restaurant';
  const restaurantAddress = order.location ? 
    `${order.location.address}, ${order.location.city}, ${order.location.state} ${order.location.zip}` : 
    order.restaurant ? 
    `${order.restaurant.address}, ${order.restaurant.city}, ${order.restaurant.state} ${order.restaurant.zip}` :
    '';
  const restaurantPhone = order.location?.phoneNumber || order.restaurant?.phone || '';

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Order Confirmed!</h1>
          <p className="mt-2 text-lg text-gray-600">
            Thank you for your order. We'll notify you when it's ready.
          </p>
        </div>

        {/* Order Details Card */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            {/* Order ID and Date */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Order #{order.id.slice(-6)}
              </h2>
              <p className="text-sm text-gray-600">
                Placed on {format(new Date(order.createdAt ?? Date.now()), 'MMM d, yyyy h:mm a')}
              </p>
            </div>

            {/* Restaurant Information */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-2">{restaurantName}</h3>
              {restaurantAddress && <p className="text-sm text-gray-600">{restaurantAddress}</p>}
              {restaurantPhone && <p className="text-sm text-gray-600">{restaurantPhone}</p>}
              {order.location && order.restaurant?.name && (
                <p className="text-sm text-gray-600 mt-1">Part of {order.restaurant.name}</p>
              )}
            </div>

            {/* Delivery Information (if applicable) */}
            {order.isDelivery && (
              <div className="mb-6 border-b border-gray-200 pb-6">
                {order.deliveryInfo?.deliveryId ? (
                  <DeliveryTracking 
                    orderId={order.id} 
                  />
                ) : (
                  <div className="space-y-2">
                    <p className="text-gray-700">
                      <span className="font-medium">Delivery Address:</span> {order.deliveryAddress}
                    </p>
                    {order.customerName && (
                      <p className="text-gray-700">
                        <span className="font-medium">Recipient:</span> {order.customerName}
                      </p>
                    )}
                    {order.customerPhone && (
                      <p className="text-gray-700">
                        <span className="font-medium">Phone:</span> {order.customerPhone}
                      </p>
                    )}
                    {order.deliveryInfo?.estimatedDeliveryTime && (
                      <p className="text-gray-700">
                        <span className="font-medium">Estimated Delivery:</span> {
                          format(new Date(order.deliveryInfo.estimatedDeliveryTime), 'MMM d, h:mm a')
                        }
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Order Items */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Order Items</h3>
              <div className="space-y-4">
                {order.items.map((item: { id: string; quantity: number; menuItem?: { name: string; price: number } | null; specialInstructions?: string | null }) => (
                  <div key={item.id} className="flex justify-between">
                    <div>
                      <span className="font-medium">{item.quantity}x </span>
                      {item.menuItem?.name}
                      {item.specialInstructions && (
                        <p className="text-sm text-gray-600 mt-1">
                          Note: {item.specialInstructions}
                        </p>
                      )}
                    </div>
                    <div className="text-gray-900">
                      {formatCurrency(item.menuItem?.price ?? 0)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="border-t border-gray-200 mt-6 pt-6">
              {/* Subtotal */}
              <div className="flex justify-between text-gray-700">
                <span>Subtotal</span>
                <span>{formatCurrency((order.total ?? 0) - (order.deliveryFee ?? 0))}</span>
              </div>
              
              {/* Delivery Fee (if applicable) */}
              {order.isDelivery && order.deliveryFee && (
                <div className="flex justify-between text-gray-700 mt-2">
                  <span>Delivery Fee</span>
                  <span>{formatCurrency(order.deliveryFee)}</span>
                </div>
              )}
              
              {/* Total */}
              <div className="flex justify-between text-lg font-medium mt-2 pt-2 border-t border-gray-100">
                <span>Total</span>
                <span>{formatCurrency(order.total ?? 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 text-center">
          <h3 className="text-lg font-medium text-gray-900">Need Help?</h3>
          <p className="mt-2 text-gray-600">
            If you have any questions about your order, please contact the restaurant.
          </p>
          <div className="mt-4">
            <Button
              onClick={() => navigateToRestaurant()}
              className="w-full"
            >
              Return to Restaurant
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 