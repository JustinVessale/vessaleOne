import { useState } from 'react';
import { useCart } from '@/features/cart/context/CartContext';
import { createCheckoutSession } from '../api/checkoutService';
import type { Schema } from '../../../../amplify/data/resource';

type Order = Schema['Order']['type'];

type CheckoutContainerProps = {
  order: Order | null;
  onSuccess: () => void;
  onError: (error: Error) => void;
};

export function CheckoutContainer({ order, onSuccess, onError }: CheckoutContainerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { state } = useCart();

  const handleCheckout = async () => {
    if (!order) return;

    setIsLoading(true);

    try {
      const { url } = await createCheckoutSession({
        orderId: order.id,
        restaurantId: order.restaurantId!,
      });

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      onError(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <button
        onClick={handleCheckout}
        disabled={isLoading || !order}
        className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Processing...' : 'Proceed to Checkout'}
      </button>
    </div>
  );
} 