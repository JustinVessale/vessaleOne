import { useNavigate } from 'react-router-dom';
import { useCart } from '../../cart/context/CartContext';
import { CheckoutContainer } from './CheckoutContainer';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../../../amplify/data/resource';
import { useToast } from '@/hooks/use-toast';
import { useState, useCallback, useRef, useEffect } from 'react';
import { DeliveryCheckout } from '@/features/delivery/components/DeliveryCheckout';

const client = generateClient<Schema>();

type Order = Schema['Order']['type'];

type DeliveryData = {
  address: string;
  deliveryFee: number;
  quoteId: string;
  estimatedDeliveryTime: string;
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

  // Mock restaurant data - in a real app, this would come from the restaurant details
  const restaurantData = {
    name: "Sample Restaurant",
    phone: "555-123-4567",
    address: {
      street: "123 Main St",
      city: "Anytown",
      state: "CA",
      zip: "12345"
    }
  };

  const createInitialOrder = useCallback(async () => {
    if (orderAttemptedRef.current) {
      console.log('Order creation already attempted in this session');
      return null;
    }

    orderAttemptedRef.current = true;
    try {
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

      const itemPromises = state.items.map(item => {
        console.log('Creating order item:', item);
        return client.models.OrderItem.create({
          orderId: newOrder.id,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions || ''
        });
      });

      const orderItems = await Promise.all(itemPromises);
      console.log('Order items created:', orderItems);

      setOrder(newOrder);
      return newOrder;
    } catch (error) {
      console.error('Error creating initial order:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
      }
      toast({
        title: "Error creating order",
        description: "There was a problem creating your order. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  }, [total, state.items, toast, isDelivery, deliveryData]);

  const handlePaymentSuccess = async (_paymentIntent: any) => {
    try {
      if (!order) {
        throw new Error('No order found');
      }

      // Clear the cart
      clearCart();
      
      // Show success message
      toast({
        title: "Order placed successfully!",
        description: "Your order has been confirmed and is being prepared.",
      });

      // Redirect to order confirmation
      navigate(`/orders/${order.id}`);
    } catch (error) {
      console.error('Error handling payment success:', error);
      toast({
        title: "Error completing order",
        description: "There was a problem completing your order. Please contact support.",
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
    setDeliveryData(data);
    setCheckoutStep('payment');
  };

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
      {checkoutStep === 'delivery-details' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-medium mb-4">Delivery Details</h2>
          <DeliveryCheckout
            restaurantAddress={restaurantData.address}
            restaurantName={restaurantData.name}
            restaurantPhone={restaurantData.phone}
            onContinue={handleDeliveryContinue}
          />
        </div>
      )}

      {/* Payment Form */}
      {checkoutStep === 'payment' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-medium mb-4">Payment Details</h2>
          <CheckoutContainer
            createInitialOrder={createInitialOrder}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />
        </div>
      )}
    </div>
  );
} 