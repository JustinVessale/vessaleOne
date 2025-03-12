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
  const { state, total, clearCart } = useCart();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [isDelivery, setIsDelivery] = useState(false);
  const [deliveryData, setDeliveryData] = useState<DeliveryData | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'delivery-option' | 'delivery' | 'payment'>('delivery-option');
  const [useDelivery, setUseDelivery] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
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

  const handleDeliveryOptionSelect = async (useDelivery: boolean) => {
    setUseDelivery(useDelivery);
    
    // If switching to delivery and we don't have an order yet, create one
    if (useDelivery && !order) {
      // Create initial order with zero delivery fee
      // We'll update the fee after user selects a delivery option
      const newOrder = await createInitialOrder();
      if (!newOrder) {
        toast({
          title: "Error",
          description: "Could not create order. Please try again.",
          variant: "destructive",
        });
        return;
      }
    } 
    // If switching to pickup and we already have an order, update it
    else if (!useDelivery && order) {
      try {
        // Update the existing order to be pickup instead of delivery
        const { data: updatedOrder, errors } = await client.models.Order.update({
          id: order.id,
          isDelivery: false,
          deliveryFee: 0, // Reset delivery fee
          deliveryAddress: '', // Clear delivery address
          deliveryInfo: null, // Clear delivery info
          updatedAt: new Date().toISOString()
        });
        
        if (errors) {
          console.error('Error updating order to pickup:', errors);
          toast({
            title: "Error",
            description: "Could not update order to pickup. Please try again.",
            variant: "destructive",
          });
          return;
        }
        
        // Update the local order state
        setOrder(updatedOrder);
        
        // Clear delivery data
        setDeliveryData(null);
      } catch (error) {
        console.error('Error updating order to pickup:', error);
        toast({
          title: "Error",
          description: "Could not update order to pickup. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }
    // If switching to pickup and we don't have an order yet, we'll create it in the payment step
    
    setCheckoutStep(useDelivery ? 'delivery' : 'payment');
  };

  const handleDeliveryContinue = async (data: DeliveryData) => {
    if (!order?.id) {
      console.error('No order ID available for Nash delivery');
      toast({
        title: "Error setting up delivery",
        description: "Could not set up delivery. Please try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Setting up delivery with Nash order ID:', data.nashOrderId);
      
      // Update the order with the selected delivery fee and Nash order ID
      const { errors } = await client.models.Order.update({
        id: order.id,
        deliveryFee: data.deliveryFee,
        deliveryAddress: data.address,
        isDelivery: true, // Ensure this is set to true
        updatedAt: new Date().toISOString(),
        // Add delivery info with explicit type casting for status
        deliveryInfo: {
          deliveryId: data.nashOrderId || '',
          quoteId: data.quoteId,
          provider: 'Nash',
          fee: data.deliveryFee,
          estimatedDeliveryTime: data.estimatedDeliveryTime,
          estimatedPickupTime: new Date().toISOString(),
          trackingUrl: '',
          status: 'PENDING' as 'PENDING' // Explicit type cast
        }
      });

      if (errors) {
        console.error('Error updating order with delivery info:', errors);
        toast({
          title: "Error",
          description: "Could not update order with delivery information.",
          variant: "destructive",
        });
        return;
      }

      // Fetch the updated order to ensure we have the latest data
      const { data: updatedOrder, errors: fetchErrors } = await client.models.Order.get({
        id: order.id
      });
      
      if (fetchErrors || !updatedOrder) {
        console.error('Error fetching updated order:', fetchErrors);
        toast({
          title: "Error",
          description: "Could not fetch updated order information.",
          variant: "destructive",
        });
        return;
      }
      
      console.log('Updated order with delivery fee:', updatedOrder);
      
      // Update the local order state with the latest data
      setOrder(updatedOrder);

      // Store Nash order ID in the component state
      setDeliveryData(data);
      setCheckoutStep('payment');
    } catch (error) {
      console.error('Error updating order with delivery info:', error);
      toast({
        title: "Error",
        description: "Could not update order with delivery information.",
        variant: "destructive",
      });
    }
  };

  // Create an initial order to get an order ID
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

      // Calculate the total with delivery fee if applicable
      const orderTotal = useDelivery 
        ? total + (deliveryData?.deliveryFee || 0) 
        : total;

      console.log(`Creating ${useDelivery ? 'delivery' : 'pickup'} order with total: ${orderTotal} (subtotal: ${total}, delivery fee: ${deliveryData?.deliveryFee || 0})`);

      const { data: newOrder, errors } = await client.models.Order.create({
        total: orderTotal,
        status: 'PENDING',
        customerEmail: '',
        restaurantId: state.items[0]?.restaurantId || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Add delivery-related fields if delivery is selected
        isDelivery: useDelivery,
        deliveryAddress: useDelivery ? (deliveryData?.address || '') : '',
        deliveryFee: useDelivery ? (deliveryData?.deliveryFee || 0) : 0,
        // Only add deliveryInfo for delivery orders
        ...(useDelivery && deliveryData ? {
          deliveryInfo: {
            deliveryId: deliveryData.nashOrderId || '',
            quoteId: deliveryData.quoteId || '',
            provider: 'Nash',
            fee: deliveryData.deliveryFee,
            estimatedDeliveryTime: deliveryData.estimatedDeliveryTime,
            estimatedPickupTime: new Date().toISOString(),
            trackingUrl: '',
            status: 'PENDING' as 'PENDING'
          }
        } : {})
      });

      if (errors) {
        console.error('GraphQL Errors:', errors);
      }

      if (!newOrder) {
        console.error('No order data returned');
        throw new Error('Failed to create initial order');
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
  }, [state.items, total, useDelivery, deliveryData, toast]);

  const handlePaymentSuccess = async (_paymentIntentId: string) => {
    try {
      if (!order) {
        console.error('No order found for payment success');
        return;
      }

      // Use the payment success handler from checkoutService
      // Only pass the Nash order ID if this is a delivery order
      await processPaymentSuccess(
        order.id,
        order.isDelivery && order.deliveryInfo?.deliveryId ? 
          order.deliveryInfo.deliveryId : undefined
      );

      // Clear the cart
      clearCart();
      
      // Navigate to order confirmation page
      navigate(`/orders/${order.id}`);
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

  // If we're loading restaurant data and on delivery step, show loading state
  if (checkoutStep === 'delivery' && isLoadingRestaurant) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-medium mb-4">Delivery Details</h2>
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="ml-3">Loading restaurant information...</p>
          </div>
        </div>
      </div>
    );
  }

  // If we're on delivery step and restaurant data failed to load, show error
  if (checkoutStep === 'delivery' && !restaurantData) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-medium mb-4">Delivery Details</h2>
          <div className="p-4 text-center">
            <p className="text-red-600 mb-4">Failed to load restaurant information</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Delivery Option Selection */}
      {checkoutStep === 'delivery-option' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-medium mb-4">Choose Delivery Option</h2>
          <div className="space-y-4">
            <button
              onClick={() => handleDeliveryOptionSelect(true)}
              className="w-full p-4 border rounded-lg hover:bg-gray-50 flex items-center"
            >
              <span className="flex-1 text-left">Delivery</span>
              <span className="text-gray-500">→</span>
            </button>
            <button
              onClick={() => handleDeliveryOptionSelect(false)}
              className="w-full p-4 border rounded-lg hover:bg-gray-50 flex items-center"
            >
              <span className="flex-1 text-left">Pickup</span>
              <span className="text-gray-500">→</span>
            </button>
          </div>
        </div>
      )}

      {/* Delivery Details */}
      {checkoutStep === 'delivery' && restaurantData && order?.id && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-medium mb-4">Delivery Details</h2>
          <DeliveryCheckout
            restaurantAddress={restaurantData.address}
            restaurantName={restaurantData.name}
            restaurantPhone={restaurantData.phone}
            orderId={order.id}
            onContinue={handleDeliveryContinue}
            onSwitchToPickup={() => handleDeliveryOptionSelect(false)}
          />
        </div>
      )}

      {/* Show loading state if we're on delivery step but don't have an order ID yet */}
      {checkoutStep === 'delivery' && restaurantData && !order?.id && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-medium mb-4">Delivery Details</h2>
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="ml-3">Creating your order...</p>
          </div>
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
            existingOrder={order}
          />
        </div>
      )}
    </div>
  );
} 