import { useCart } from '../../cart/context/CartContext';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../../../amplify/data/resource';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useRef } from 'react';
import { DeliveryCheckout } from '@/features/delivery/components/DeliveryCheckout';
import { useQuery } from '@tanstack/react-query';
import { createCheckoutSession } from '../api/checkoutService';
import { useNavigate } from 'react-router-dom';

const client = generateClient<Schema>();

type Order = Schema['Order']['type'];

interface CheckoutPageProps {
  restaurantIsOpen?: boolean;
  locationIsOpen?: boolean;
}

export function CheckoutPage({ restaurantIsOpen = true, locationIsOpen }: CheckoutPageProps) {
  const { state, subtotal, serviceFee, total } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'delivery-option' | 'delivery' | 'payment'>('delivery-option');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const orderAttemptedRef = useRef(false);

  // Get the locationId from the first cart item (if available)
  const locationId = state.items[0]?.locationId;


  // Determine if the restaurant is open based on location or restaurant status
  const isOpen = locationIsOpen !== undefined ? locationIsOpen : restaurantIsOpen;

  // Redirect if restaurant is closed
  useEffect(() => {
    if (!isOpen) {
      toast({
        title: 'Restaurant Closed',
        description: 'The restaurant is currently closed. Please try again later.',
        variant: 'destructive',
      });
      navigate('/');
    }
  }, [isOpen, navigate, toast]);

  // Show error if restaurant is closed
  if (!isOpen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Restaurant Closed</h2>
          <p className="text-gray-600 mb-6">
            The restaurant is currently closed and not accepting orders. Please try again later.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Menu
          </button>
        </div>
      </div>
    );
  }

  // Fetch restaurant data (for delivery address)
  const { data: restaurantData, isLoading: isLoadingRestaurant } = useQuery({
    queryKey: ['restaurant', state.items[0]?.restaurantId, locationId],
    queryFn: async () => {
      if (!state.items[0]?.restaurantId) {
        throw new Error('No restaurant ID found in cart');
      }
      if (locationId) {
        const { data, errors } = await client.models.RestaurantLocation.list({
          filter: { id: { eq: locationId } }
        });
        if (errors) throw new Error('Failed to fetch restaurant location details');
        if (!data || data.length === 0) throw new Error('Restaurant location data is incomplete');
        return {
          name: data[0].name,
          phone: data[0].phoneNumber,
          address: {
            street: data[0].address,
            city: data[0].city,
            state: data[0].state,
            zip: data[0].zip
          }
        };
      } else {
        const { data, errors } = await client.models.Restaurant.get({
          id: state.items[0].restaurantId
        });
        if (errors) throw new Error('Failed to fetch restaurant details');
        if (!data) throw new Error('Restaurant data is incomplete');
        return {
          name: data.name,
          phone: data.phone,
          address: {
            street: data.address,
            city: data.city,
            state: data.state,
            zip: data.zip
          }
        };
      }
    },
    enabled: !!state.items[0]?.restaurantId
  });

  // Create the order as soon as the checkout page loads (if not already created)
  useEffect(() => {
    if (order || orderAttemptedRef.current) return;
    if (state.items.length === 0) return;
    orderAttemptedRef.current = true;
    (async () => {
      setIsLoading(true);
      setLoadingMessage('Creating Order...');
      try {
        const timestamp = Date.now();
        const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const externalId = `ord_${timestamp}${randomSuffix}`;
        const { data: newOrder, errors } = await client.models.Order.create({
          total,
          status: 'PENDING',
          customerEmail: '',
          restaurantId: state.items[0]?.restaurantId || '',
          ...(locationId ? { locationId } : {}),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          externalId,
          isDelivery: false,
          deliveryAddress: '',
          deliveryFee: 0,
        });
        if (errors || !newOrder) throw new Error('Failed to create order');
        // Create order items
        const orderItemPromises = state.items.map(item =>
          client.models.OrderItem.create({
            orderId: newOrder.id,
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            specialInstructions: item.specialInstructions
          })
        );
        const orderItemResults = await Promise.all(orderItemPromises);
        
        // Check if any order items failed to create
        const failedItems = orderItemResults.filter(result => result.errors);
        if (failedItems.length > 0) {
          console.error('Failed to create order items:', failedItems);
          throw new Error('Failed to create order items');
        }
        
        // Add a small delay to ensure order items are fully created
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setOrder(newOrder);
        console.log('Order created successfully:', newOrder);
        setIsLoading(false);
        setLoadingMessage('');
      } catch (err) {
        setIsLoading(false);
        setLoadingMessage('');
        setError('Failed to create order. Please try again.');
        toast({
          title: 'Order Creation Failed',
          description: 'Could not create your order. Please try again.',
          variant: 'destructive',
        });
      }
    })();
  }, [order, state.items, total, locationId, toast]);

  // Cart summary component (read-only)
  function CartSummary() {
    return (
      <div className="w-full max-w-md mx-auto p-4 sm:p-6 bg-white rounded-lg shadow space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Your Order</h2>
        <ul className="divide-y">
          {state.items.map(item => (
            <li key={item.id} className="flex items-center space-x-4 py-3">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-lg object-cover" />
              ) : (
                <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400">🍽️</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-base">{item.name}</span>
                  <span className="font-semibold">${item.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mt-1 text-sm text-gray-500">
                  <span>Qty: {item.quantity}</span>
                  {item.specialInstructions && <span>Note: {item.specialInstructions}</span>}
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex justify-between items-center border-t pt-4 mt-2">
          <span className="text-lg font-semibold">Subtotal</span>
          <span className="text-lg font-semibold">${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center border-t pt-4 mt-2">
          <span className="text-lg font-semibold">Service Fee</span>
          <span className="text-lg font-semibold">${serviceFee.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center border-t pt-4 mt-2">
          <span className="text-lg font-semibold">Total</span>
          <span className="text-lg font-semibold">${total.toFixed(2)}</span>
        </div>
      </div>
    );
  }

  // Step 1: Delivery or Pickup selection
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <span className="ml-2">{loadingMessage || 'Loading...'}</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="text-red-600 p-4 bg-red-50 rounded-md">
        <p className="font-medium">Error: {error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-2 text-sm text-red-700 hover:text-red-800"
        >
          Try Again
        </button>
      </div>
    );
  }
  if (!order) {
    return null;
  }
  if (checkoutStep === 'delivery-option') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-start bg-gray-50 p-2 sm:p-4">
        <CartSummary />
        <div className="w-full max-w-md mx-auto mt-6 space-y-4">
          <h3 className="text-lg font-medium text-gray-900">How would you like to receive your order?</h3>
          <div className="flex flex-col gap-4">
            <button
              type="button"
              className="w-full py-3 rounded-lg border border-primary-600 text-primary-700 font-semibold bg-white hover:bg-primary-50 transition-colors"
              onClick={async (e) => {
                e.preventDefault();
                console.log('Pickup button clicked');
                console.log('Current order:', order);
                setIsLoading(true);
                setLoadingMessage('Redirecting to payment...');
                try {
                  // Update order to pickup
                  const { data: updatedOrder, errors } = await client.models.Order.update({
                    id: order.id,
                    isDelivery: false,
                    deliveryFee: 0,
                    deliveryAddress: '',
                    deliveryInfo: null,
                    updatedAt: new Date().toISOString(),
                  });
                  if (errors || !updatedOrder) throw new Error('Failed to update order');
                  console.log('Order updated for pickup:', updatedOrder);
                  setOrder(updatedOrder);
                  // Use restaurantId from updatedOrder, fallback to order.restaurantId
                  const restaurantId = updatedOrder.restaurantId || order.restaurantId;
                  if (!restaurantId) throw new Error('Missing restaurantId for checkout session');
                  console.log('Creating checkout session for order:', updatedOrder.id, 'restaurant:', restaurantId);
                  const { url } = await createCheckoutSession({
                    orderId: updatedOrder.id,
                    restaurantId,
                  });
                  console.log('Checkout session created, redirecting to:', url);
                  window.location.href = url;
                } catch (err) {
                  setIsLoading(false);
                  setLoadingMessage('');
                  console.error('Pickup payment redirect error:', err);
                  toast({
                    title: 'Payment Redirect Failed',
                    description: 'Could not start payment. Please try again.',
                    variant: 'destructive',
                  });
                }
              }}
            >
              Pickup
            </button>
            <button
              type="button"
              className="w-full py-3 rounded-lg border border-primary-600 text-primary-700 font-semibold bg-white hover:bg-primary-50 transition-colors"
              onClick={(e) => {
                e.preventDefault();
                console.log('Delivery button clicked');
                setCheckoutStep('delivery');
              }}
            >
              Delivery
            </button>
          </div>
        </div>
      </div>
    );
  }
  if (checkoutStep === 'delivery') {
    if (isLoadingRestaurant || !restaurantData) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <span className="ml-2">Loading restaurant info...</span>
        </div>
      );
    }

    //DELIVERY ORDERS
    return (
      <div className="min-h-screen flex flex-col items-center justify-start bg-gray-50 p-2 sm:p-4">
        <CartSummary />
        <div className="w-full max-w-md mx-auto mt-6">
          <DeliveryCheckout
            restaurantAddress={{
              street: restaurantData.address.street || '',
              city: restaurantData.address.city || '',
              state: restaurantData.address.state || '',
              zip: restaurantData.address.zip || '',
            }}
            restaurantName={restaurantData.name || ''}
            restaurantPhone={restaurantData.phone || ''}
            orderId={order.id}
            locationId={locationId}
            onContinue={async (deliveryData) => {
              setIsLoading(true);
              setLoadingMessage('Redirecting to payment...');
              try {
                // Update order to delivery
                const { data: updatedOrder, errors } = await client.models.Order.update({
                  id: order.id,
                  isDelivery: true,
                  deliveryFee: deliveryData.deliveryFee,
                  deliveryAddress: deliveryData.address,
                  updatedAt: new Date().toISOString(),
                  deliveryInfo: {
                    deliveryId: deliveryData.nashOrderId || '',
                    quoteId: deliveryData.quoteId,
                    provider: 'Nash',
                    fee: deliveryData.deliveryFee,
                    estimatedDeliveryTime: deliveryData.estimatedDeliveryTime,
                    estimatedPickupTime: new Date().toISOString(),
                    trackingUrl: '',
                    status: 'PENDING' as 'PENDING',
                  },
                });
                if (errors || !updatedOrder) throw new Error('Failed to update order');
                setOrder(updatedOrder);
                // Use restaurantId from updatedOrder, fallback to order.restaurantId
                const restaurantId = updatedOrder.restaurantId || order.restaurantId;
                if (!restaurantId) throw new Error('Missing restaurantId for checkout session');
                const { url } = await createCheckoutSession({
                  orderId: updatedOrder.id,
                  restaurantId,
                });
                window.location.href = url;
              } catch (err) {
                setIsLoading(false);
                setLoadingMessage('');
                console.error('Delivery payment redirect error:', err);
                toast({
                  title: 'Payment Redirect Failed',
                  description: 'Could not start payment. Please try again.',
                  variant: 'destructive',
                });
              }
            }}
            onSwitchToPickup={async () => {
              setIsLoading(true);
              setLoadingMessage('Redirecting to payment...');
              try {
                // Update order to pickup
                const { data: updatedOrder, errors } = await client.models.Order.update({
                  id: order.id,
                  isDelivery: false,
                  deliveryFee: 0,
                  deliveryAddress: '',
                  deliveryInfo: null,
                  updatedAt: new Date().toISOString(),
                });
                if (errors || !updatedOrder) throw new Error('Failed to update order');
                setOrder(updatedOrder);
                // Use restaurantId from updatedOrder, fallback to order.restaurantId
                const restaurantId = updatedOrder.restaurantId || order.restaurantId;
                if (!restaurantId) throw new Error('Missing restaurantId for checkout session');
                const { url } = await createCheckoutSession({
                  orderId: updatedOrder.id,
                  restaurantId,
                });
                window.location.href = url;
              } catch (err) {
                setIsLoading(false);
                setLoadingMessage('');
                console.error('Switch to Pickup payment redirect error:', err);
                toast({
                  title: 'Payment Redirect Failed',
                  description: 'Could not start payment. Please try again.',
                  variant: 'destructive',
                });
              }
            }}
          />
        </div>
      </div>
    );
  }
  return null;
} 