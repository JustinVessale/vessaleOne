import { useState } from 'react';
import { createCheckoutSession } from '../api/checkoutService';
import type { Schema } from '../../../../amplify/data/resource';
import { useToast } from '@/hooks/use-toast';

type Order = Schema['Order']['type'];

type CheckoutContainerProps = {
  order: Order | null;
  onSuccess: () => void;
  onError: (error: Error) => void;
};

export function CheckoutContainer({ order, onError }: CheckoutContainerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleCheckout = async () => {
    if (!order) {
      toast({
        title: "Error",
        description: "No order found. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { url } = await createCheckoutSession({
        orderId: order.id,
        restaurantId: order.restaurantId!,
      });

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create checkout session';
      
      toast({
        title: "Checkout Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      onError(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <button
        onClick={handleCheckout}
        disabled={isLoading || !order}
        className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Processing...
          </div>
        ) : (
          'Proceed to Checkout'
        )}
      </button>
      
      {!order && (
        <p className="text-sm text-gray-500 text-center">
          Please add items to your cart before proceeding to checkout.
        </p>
      )}
    </div>
  );
} 