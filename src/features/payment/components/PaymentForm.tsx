import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/features/cart/context/CartContext';
import { formatCurrency } from '@/utils/currency';
import type { Schema } from '../../../../amplify/data/resource';

type Order = Schema['Order']['type'];

export type PaymentFormProps = {
  onSuccess: () => Promise<void>;
  onError: (error: Error) => void;
  order: Order | null;
};

export function PaymentForm({ onSuccess, onError, order }: PaymentFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { state, total } = useCart();

  const handleCheckout = async () => {
    if (!order) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: order.id,
          restaurantId: order.restaurantId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (error) {
      onError(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const deliveryFee = order?.deliveryFee || 0;
  const isDelivery = order?.isDelivery || false;
  const subtotal = total;
  const orderTotal = parseFloat((subtotal + deliveryFee).toFixed(2));

  return (
    <div className="space-y-6">
      {/* Order Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h3>
        
        {/* Cart Items */}
        <div className="space-y-3 mb-4">
          {state.items.map((item) => (
            <div key={item.id} className="flex justify-between items-center">
              <div className="flex items-center">
                <span className="font-medium mr-2">{item.quantity}x</span>
                <span>{item.name}</span>
              </div>
              <span className="text-gray-700">{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>
        
        {/* Divider */}
        <div className="border-t border-gray-200 my-4"></div>
        
        {/* Subtotal */}
        <div className="flex justify-between text-gray-700">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        
        {/* Delivery Fee (if applicable) */}
        {isDelivery && (
          <div className="flex justify-between text-gray-700 mt-2">
            <span>Delivery Fee</span>
            <span>{formatCurrency(deliveryFee)}</span>
          </div>
        )}
        
        {/* Total */}
        <div className="flex justify-between text-lg font-medium mt-3 pt-3 border-t border-gray-200">
          <span>Total</span>
          <span>{formatCurrency(orderTotal)}</span>
        </div>
      </div>
      
      {/* Checkout Button */}
      <Button
        onClick={handleCheckout}
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? 'Processing...' : `Proceed to Checkout - ${formatCurrency(orderTotal)}`}
      </Button>
    </div>
  );
} 