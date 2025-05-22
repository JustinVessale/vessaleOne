import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../../cart/context/CartContext';
import { CheckoutContainer } from './CheckoutContainer';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../../../amplify/data/resource';
import { useToast } from '@/hooks/use-toast';
import { useState, useCallback, useRef } from 'react';
import { DeliveryCheckout } from '@/features/delivery/components/DeliveryCheckout';
import { useQuery } from '@tanstack/react-query';
import { handlePaymentSuccess as processPaymentSuccess } from '../api/checkoutService';

const client = generateClient<Schema>();

type Order = Schema['Order']['type'];

type DeliveryData = {
  address: string;
  deliveryFee: number;
  quoteId: string;
  estimatedDeliveryTime: string;
  nashOrderId?: string;
};

export function CheckoutPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { state, total, clearCart } = useCart();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [deliveryData, setDeliveryData] = useState<DeliveryData | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'delivery-option' | 'delivery' | 'payment'>('delivery-option');
  const [useDelivery, setUseDelivery] = useState(false);
  const orderAttemptedRef = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get the locationId from the first cart item (if available)
  const locationId = state.items[0]?.locationId;

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
          <span className="text-lg font-semibold">${total.toFixed(2)}</span>
        </div>
      </div>
    );
  }

  // Step 1: Delivery or Pickup selection
  if (checkoutStep === 'delivery-option') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-start bg-gray-50 p-2 sm:p-4">
        <CartSummary />
        <div className="w-full max-w-md mx-auto mt-6 space-y-4">
          <h3 className="text-lg font-medium text-gray-900">How would you like to receive your order?</h3>
          <div className="flex flex-col gap-4">
            <button
              className="w-full py-3 rounded-lg border border-primary-600 text-primary-700 font-semibold bg-white hover:bg-primary-50 transition-colors"
              onClick={() => {
                setUseDelivery(false);
                setCheckoutStep('payment');
                setIsLoading(true);
                createInitialOrder(false);
              }}
            >
              Pickup
            </button>
            <button
              className="w-full py-3 rounded-lg border border-primary-600 text-primary-700 font-semibold bg-white hover:bg-primary-50 transition-colors"
              onClick={() => {
                setUseDelivery(true);
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

  // Step 2: Delivery address entry and fee calculation
  if (checkoutStep === 'delivery') {
    if (isLoadingRestaurant || !restaurantData) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <span className="ml-2">Loading restaurant info...</span>
        </div>
      );
    }
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
            orderId={order?.id || ''}
            locationId={locationId}
            onContinue={async (deliveryData) => {
              setDeliveryData(deliveryData);
              setIsLoading(true);
              await createInitialOrder(true, deliveryData);
              setCheckoutStep('payment');
            }}
            onSwitchToPickup={() => {
              setUseDelivery(false);
              setCheckoutStep('payment');
              setIsLoading(true);
              createInitialOrder(false);
            }}
          />
        </div>
      </div>
    );
  }

  // Step 3: Payment
  if (checkoutStep === 'payment') {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <span className="ml-2">Preparing checkout...</span>
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
      return (
        <div className="text-red-600 p-4 bg-red-50 rounded-md">
          Failed to create order. Please try again.
        </div>
      );
    }
    return (
      <div className="max-w-md mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Checkout</h1>
        <CheckoutContainer
          order={order}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
        />
      </div>
    );
  }

  // Fallback
  return null;

  // ---
  // Order creation logic
  async function createInitialOrder(isDelivery: boolean, deliveryDataArg?: DeliveryData) {
    if (orderAttemptedRef.current) {
      setIsLoading(false);
      return null;
    }
    orderAttemptedRef.current = true;
    setIsLoading(true);
    try {
      if (state.items.length === 0) {
        toast({
          title: "Error creating order",
          description: "Your cart is empty. Please add items before checkout.",
          variant: "destructive",
        });
        setIsLoading(false);
        return null;
      }
      const orderTotal = isDelivery
        ? total + (deliveryDataArg?.deliveryFee || 0)
        : total;
      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const externalId = `ord_${timestamp}${randomSuffix}`;
      const { data: newOrder, errors } = await client.models.Order.create({
        total: orderTotal,
        status: 'PENDING',
        customerEmail: '',
        restaurantId: state.items[0]?.restaurantId || '',
        ...(locationId ? { locationId } : {}),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        externalId,
        isDelivery,
        deliveryAddress: isDelivery ? (deliveryDataArg?.address || '') : '',
        deliveryFee: isDelivery ? (deliveryDataArg?.deliveryFee || 0) : 0,
        ...(isDelivery && deliveryDataArg ? {
          deliveryInfo: {
            deliveryId: deliveryDataArg.nashOrderId || '',
            quoteId: deliveryDataArg.quoteId || '',
            provider: 'Nash',
            fee: deliveryDataArg.deliveryFee,
            estimatedDeliveryTime: deliveryDataArg.estimatedDeliveryTime,
            estimatedPickupTime: new Date().toISOString(),
            trackingUrl: '',
            status: 'PENDING' as 'PENDING'
          }
        } : {})
      });
      if (errors) {
        setError('Failed to create order. Please try again.');
        setIsLoading(false);
        return null;
      }
      if (!newOrder) {
        setError('No order data returned.');
        setIsLoading(false);
        return null;
      }
      // Create order items
      const orderItemPromises = state.items.map(item =>
        client.models.OrderItem.create({
          orderId: newOrder.id,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions
        })
      );
      await Promise.all(orderItemPromises);
      setOrder(newOrder);
      setIsLoading(false);
      return newOrder;
    } catch (error) {
      setError('Error creating initial order.');
      setIsLoading(false);
      return null;
    }
  }

  function handlePaymentSuccess() {
    navigate('/order/confirmation');
  }

  function handlePaymentError(error: Error) {
    setError(error.message);
  }
} 