import { useNavigate } from 'react-router-dom';
import { useCart } from '../../cart/context/CartContext';
import { CheckoutContainer } from './CheckoutContainer';
import { type Order } from '@/features/order/types';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../../../amplify/data/resource';
import { OrderStatus } from '@/features/order/types';
import { useToast } from '@/hooks/use-toast';

const client = generateClient<Schema>();

export function CheckoutPage() {
  const navigate = useNavigate();
  const { state, total, clearCart } = useCart();
  const { toast } = useToast();

  const handlePaymentSuccess = async (paymentIntent: any) => {
    try {
      // First create the order
      const { data: order, errors: orderErrors } = await client.models.Order.create({
        total,
        status: OrderStatus.PAID,
        stripePaymentIntentId: paymentIntent.id,
        customerEmail: '',
        restaurantId: state.items[0]?.restaurantId || '', // Get restaurantId from first item
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      if (orderErrors || !order) {
        throw new Error('Failed to create order');
      }

      // Then create order items
      const itemPromises = state.items.map(item => 
        client.models.OrderItem.create({
          orderId: order.id,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions || ''
        })
      );

      await Promise.all(itemPromises);

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
      console.error('Error creating order:', error);
      toast({
        title: "Error placing order",
        description: "There was a problem creating your order. Please try again.",
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

  // Create initial order object
  const order: Order = {
    id: crypto.randomUUID(), // Temporary ID for the payment intent
    total,
    status: OrderStatus.PENDING,
    items: state.items,
    customerEmail: '', // TODO: Add customer email
    restaurantId: '', // TODO: Add restaurant ID
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
          order={order}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
        />
      </div>
    </div>
  );
} 