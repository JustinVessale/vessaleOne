import { useNavigate } from 'react-router-dom';
import { useCart } from '../../cart/context/CartContext';
import { CheckoutContainer } from './CheckoutContainer';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../../../amplify/data/resource';
import { useToast } from '@/hooks/use-toast';
import { useState, useCallback, useRef, useEffect } from 'react';
import { DeliveryCheckout } from '@/features/delivery/components/DeliveryCheckout';
import { autodispatchOrder } from '@/lib/services/nashService';
import { useQuery } from '@tanstack/react-query';

const client = generateClient<Schema>();

type Order = Schema['Order']['type'];

type DeliveryData = {
  address: string;
  deliveryFee: number;
  quoteId: string;
  estimatedDeliveryTime: string;
  nashOrderId?: string;
  externalId: string;
};

export function CheckoutPage() {
  const navigate = useNavigate();
  const { state, total, clearCart } = useCart();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [isDelivery, setIsDelivery] = useState(false);
  const [deliveryData, setDeliveryData] = useState<DeliveryData | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'delivery-option' | 'delivery-details' | 'payment'>('delivery-option');
  const orderAttemptedRef = useRef(false);

  // Reset the ref when component mounts
  useEffect(() => {
    orderAttemptedRef.current = false;
    
    return () => {
      orderAttemptedRef.current = false;
    };
  }, []);

  // Fetch restaurant data
  const { data: restaurantData, isLoading: isLoadingRestaurant } = useQuery({
    queryKey: ['restaurant', state.items[0]?.restaurantId],
    queryFn: async () => {
      if (!state.items[0]?.restaurantId) {
        throw new Error('No restaurant ID found in cart');
      }
      
      const { data, errors } = await client.models.Restaurant.get({
        id: state.items[0].restaurantId
      });
      
      if (errors) {
        console.error('Error fetching restaurant:', errors);
        throw new Error('Failed to fetch restaurant details');
      }
      
      if (!data || !data.name || !data.phone || !data.address || !data.city || !data.state || !data.zip) {
        throw new Error('Restaurant data is incomplete');
      }
      
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
    },
    enabled: !!state.items[0]?.restaurantId
  });

  const createInitialOrder = useCallback(async () => {
    if (orderAttemptedRef.current) {
      console.log('Order creation already attempted in this session');
      return null;
    }

    orderAttemptedRef.current = true;
    try {
      // Check if cart is empty
      if (state.items.length === 0) {
        console.error('Cannot create order with empty cart');
        toast({
          title: "Error creating order",
          description: "Your cart is empty. Please add items before checkout.",
          variant: "destructive",
        });
        return null;
      }

      // Log the input data
      console.log('Creating order with:', {
        total,
        restaurantId: state.items[0]?.restaurantId || '',
        itemsCount: state.items.length,
        isDelivery,
        deliveryData
      });

      // Calculate the total with delivery fee if applicable
      const orderTotal = isDelivery 
        ? total + (deliveryData?.deliveryFee || 0) 
        : total;

      console.log('Order total:', orderTotal);
      console.log('Cart total:', total);
      console.log('Delivery fee:', deliveryData?.deliveryFee || 0);

      const { data: newOrder, errors } = await client.models.Order.create({
        total: orderTotal,
        status: 'PENDING',
        customerEmail: '',
        restaurantId: state.items[0]?.restaurantId || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Add delivery-related fields if delivery is selected
        isDelivery,
        deliveryAddress: deliveryData?.address || '',
        deliveryFee: deliveryData?.deliveryFee || 0,
        // If we have customer info from delivery form
        customerName: deliveryData ? 'Customer Name' : '',
        customerPhone: deliveryData ? 'Customer Phone' : '',
        // Add delivery info if available
        ...(deliveryData && {
          deliveryInfo: {
            quoteId: deliveryData.quoteId,
            estimatedDeliveryTime: deliveryData.estimatedDeliveryTime,
            status: 'PENDING'
          }
        })
      });

      // Log any GraphQL errors
      if (errors) {
        console.error('GraphQL Errors:', errors);
      }

      if (!newOrder) {
        console.error('No order data returned');
        throw new Error('Failed to create initial order');
      }

      // Log successful order creation
      console.log('Order created:', newOrder);

      // Create order items
      console.log('Creating order items for order:', newOrder.id);
      console.log('Cart items:', state.items);

      // Create all order items in parallel
      const orderItemPromises = state.items.map(item => 
        client.models.OrderItem.create({
          orderId: newOrder.id,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions
        })
      );

      const orderItemResults = await Promise.all(orderItemPromises);
      
      // Check for any errors in creating order items
      const orderItemErrors = orderItemResults
        .map(result => result.errors)
        .filter(Boolean);
      
      if (orderItemErrors.length > 0) {
        console.error('Errors creating order items:', orderItemErrors);
        throw new Error('Failed to create some order items');
      }

      // Update the local order state
      setOrder(newOrder);
      return newOrder;
    } catch (error) {
      console.error('Error creating initial order:', error);
      toast({
        title: "Error creating order",
        description: "There was a problem creating your order. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  }, [state.items, total, isDelivery, deliveryData, toast]);

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    try {
      if (!order) {
        console.error('No order found for payment success');
        return;
      }

      console.log('Payment successful for order:', order.id);
      console.log('Payment Intent ID:', paymentIntentId);

      // Update order status to PAID
      const { data: updatedOrder, errors: updateErrors } = await client.models.Order.update({
        id: order.id,
        status: 'PAID',
        // We don't have a dedicated field for payment intent ID
        // We'll just log it for now
        updatedAt: new Date().toISOString()
      });

      if (updateErrors) {
        console.error('Error updating order status:', updateErrors);
        toast({
          title: "Error updating order",
          description: "There was a problem updating your order status.",
          variant: "destructive",
        });
        return;
      }

      console.log('Order updated successfully:', updatedOrder);

      // If this is a delivery order and we have a Nash order ID, autodispatch it
      if (isDelivery && deliveryData?.nashOrderId) {
        try {
          console.log('Autodispatching Nash delivery for order:', deliveryData.nashOrderId);
          const nashResponse = await autodispatchOrder(deliveryData.nashOrderId);
          
          // Update the order with the Nash delivery ID if available
          if (nashResponse.delivery?.id) {
            // Store the delivery ID in the deliveryInfo field
            const deliveryInfo = {
              ...order.deliveryInfo,
              deliveryId: nashResponse.delivery.id,
              status: 'CONFIRMED' as const // Use a valid status from the enum
            };
            
            const { data: orderWithDeliveryId, errors: deliveryUpdateErrors } = await client.models.Order.update({
              id: order.id,
              deliveryInfo,
              updatedAt: new Date().toISOString()
            });
            
            if (deliveryUpdateErrors) {
              console.error('Error updating order with delivery ID:', deliveryUpdateErrors);
            } else {
              console.log('Order updated with delivery ID:', orderWithDeliveryId);
            }
          }
        } catch (nashError) {
          console.error('Error autodispatching Nash delivery:', nashError);
          // Continue with order confirmation even if Nash dispatch fails
          // The restaurant can manually dispatch the order if needed
        }
      }

      // Clear the cart
      clearCart();
      
      // Navigate to order confirmation page
      navigate(`/order-confirmation/${order.id}`);
    } catch (error) {
      console.error('Error handling payment success:', error);
      toast({
        title: "Error processing order",
        description: "There was a problem processing your order after payment.",
        variant: "destructive",
      });
    }
  };

  const handlePaymentError = (error: any) => {
    console.error('Payment error:', error);
    toast({
      title: "Payment failed",
      description: error.message || "There was a problem processing your payment. Please try again.",
      variant: "destructive",
    });
  };

  const handleDeliveryOptionSelect = (useDelivery: boolean) => {
    setIsDelivery(useDelivery);
    setCheckoutStep(useDelivery ? 'delivery-details' : 'payment');
  };

  const handleDeliveryContinue = (data: DeliveryData) => {
    if (!order?.id) {
      console.error('No order ID available for Nash external ID');
      toast({
        title: "Error setting up delivery",
        description: "Could not set up delivery. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setDeliveryData({
      ...data,
      externalId: order.id // Use our order ID as the external ID
    });
    setCheckoutStep('payment');
  };

  // If we're loading restaurant data and on delivery details step, show loading state
  if (checkoutStep === 'delivery-details' && isLoadingRestaurant) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // If we're on delivery details step and restaurant data failed to load, show error
  if (checkoutStep === 'delivery-details' && !restaurantData) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-medium">Error Loading Restaurant Data</h2>
          <p className="text-red-600 mt-1">Unable to load restaurant details. Please try again later.</p>
          <button
            onClick={() => setCheckoutStep('delivery-option')}
            className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-8">
      <h1 className="text-2xl font-semibold">Checkout</h1>
      
      {/* Order Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-medium mb-4">Order Summary</h2>
        <div className="space-y-4">
          {state.items.map((item) => (
            <div key={item.id} className="flex justify-between">
              <div>
                <span className="font-medium">{item.quantity}x </span>
                {item.name}
              </div>
              <div>${(item.price * item.quantity).toFixed(2)}</div>
            </div>
          ))}
          
          {/* Show delivery fee if applicable */}
          {isDelivery && deliveryData && (
            <div className="flex justify-between text-gray-700">
              <span>Delivery Fee</span>
              <span>${deliveryData.deliveryFee.toFixed(2)}</span>
            </div>
          )}
          
          <div className="border-t pt-4">
            <div className="flex justify-between font-medium">
              <span>Total</span>
              <span>
                ${(total + (isDelivery && deliveryData ? deliveryData.deliveryFee : 0)).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Option Selection */}
      {checkoutStep === 'delivery-option' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-medium mb-4">Delivery Options</h2>
          <div className="space-y-4">
            <button
              onClick={() => handleDeliveryOptionSelect(false)}
              className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 shadow-sm transition-all"
            >
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                <div className="text-left">
                  <h3 className="font-medium">Pickup</h3>
                  <p className="text-sm text-gray-600">Pick up your order at the restaurant</p>
                </div>
              </div>
              <div className="text-primary-600 font-medium text-center flex flex-col justify-center min-w-[80px]">
                <span className="text-xs opacity-0">From</span>
                <span>Free</span>
              </div>
            </button>
            
            <button
              onClick={() => handleDeliveryOptionSelect(true)}
              className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 shadow-sm transition-all"
            >
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                </svg>
                <div className="text-left">
                  <h3 className="font-medium">Delivery</h3>
                  <p className="text-sm text-gray-600">Get your order delivered to your door</p>
                </div>
              </div>
              <div className="text-primary-600 font-medium text-center flex flex-col justify-center min-w-[80px]">
                <span className="text-xs">From</span>
                <span>$3.99</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Delivery Details */}
      {checkoutStep === 'delivery-details' && restaurantData && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-medium mb-4">Delivery Details</h2>
          <DeliveryCheckout
            restaurantAddress={restaurantData.address}
            restaurantName={restaurantData.name}
            restaurantPhone={restaurantData.phone}
            orderId={order?.id}
            onContinue={handleDeliveryContinue}
          />
        </div>
      )}

      {/* Payment Form */}
      {checkoutStep === 'payment' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-medium mb-4">Payment</h2>
          <CheckoutContainer
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            createInitialOrder={createInitialOrder}
          />
        </div>
      )}
    </div>
  );
} 