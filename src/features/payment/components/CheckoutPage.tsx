import { useNavigate } from 'react-router-dom';
import { useCart } from '../../cart/context/CartContext';
import { CheckoutContainer } from './CheckoutContainer';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../../../amplify/data/resource';
import { OrderStatus } from '@/features/order/types';
import { useToast } from '@/hooks/use-toast';
import { useState, useCallback } from 'react';

const client = generateClient<Schema>();

type Order = Schema['Order']['type'];

export function CheckoutPage() {
  const navigate = useNavigate();
  const { state, total, clearCart } = useCart();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);

  // Memoize createInitialOrder to prevent infinite re-renders
  const createInitialOrder = useCallback(async () => {
    try {
      const { data: newOrder, errors } = await client.models.Order.create({
        total,
        status: OrderStatus.PENDING,
        customerEmail: '', // TODO: Add customer email when we have auth
        restaurantId: state.items[0]?.restaurantId || '', // Get restaurantId from first item
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      if (errors || !newOrder) {
        throw new Error('Failed to create initial order');
      }

      // Create order items
      const itemPromises = state.items.map(item => 
        client.models.OrderItem.create({
          orderId: newOrder.id,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions || ''
        })
      );

      await Promise.all(itemPromises);
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