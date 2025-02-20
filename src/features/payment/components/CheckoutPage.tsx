import { useNavigate } from 'react-router-dom';
import { useCart } from '../../cart/context/CartContext';
import { CheckoutContainer } from './CheckoutContainer';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../../../amplify/data/resource';
import { useToast } from '@/hooks/use-toast';
import { useState, useCallback, useRef, useEffect } from 'react';

const client = generateClient<Schema>();

type Order = Schema['Order']['type'];

export function CheckoutPage() {
  const navigate = useNavigate();
  const { state, total, clearCart } = useCart();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const orderAttemptedRef = useRef(false);

  // Reset the ref when component mounts
  useEffect(() => {
    orderAttemptedRef.current = false;
    
    return () => {
      orderAttemptedRef.current = false;
    };
  }, []);

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
        itemsCount: state.items.length
      });

      const { data: newOrder, errors } = await client.models.Order.create({
        total,
        status: 'PENDING',
        customerEmail: '',
        restaurantId: state.items[0]?.restaurantId || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
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
  }, [total, state.items, toast]);

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
          <div className="border-t pt-4">
            <div className="flex justify-between font-medium">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-medium mb-4">Payment Details</h2>
        <CheckoutContainer
          createInitialOrder={createInitialOrder}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
        />
      </div>
    </div>
  );
} 