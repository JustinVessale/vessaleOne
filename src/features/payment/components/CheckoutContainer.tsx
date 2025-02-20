import { useEffect, useState, useRef } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { PaymentForm } from './PaymentForm';
import { createPaymentIntent } from '../api/checkoutService';
import type { Schema } from '../../../../amplify/data/resource';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

type Order = Schema['Order']['type']

type CheckoutContainerProps = {
  onSuccess: (paymentIntent: any) => Promise<void>;
  onError: (error: any) => void;
  createInitialOrder: () => Promise<Order | null>;
};

export function CheckoutContainer({ onSuccess, onError, createInitialOrder }: CheckoutContainerProps) {
  const [clientSecret, setClientSecret] = useState<string>('');
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initializationPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    async function initializePayment() {
      try {
        // Create the order first
        const newOrder = await createInitialOrder();
        if (!newOrder) {
          setError('Failed to create order');
          return;
        }
        
        setOrder(newOrder);
        
        const params = {
          orderId: newOrder.id,
          total: newOrder.total ?? 0,
          restaurantId: newOrder.restaurantId ?? ''
        };
        
        console.log('Creating payment intent with params:', params);
        
        const response = await createPaymentIntent(params);
        console.log('Payment intent response:', response);
        
        if (!response.clientSecret) {
          throw new Error('No client secret received from payment intent');
        }
        
        setClientSecret(response.clientSecret);
      } catch (error) {
        console.error('Error in payment initialization:', error);
        setError(error instanceof Error ? error.message : 'An unexpected error occurred');
        onError(error);
      } finally {
        setIsLoading(false);
      }
    }

    // Only initialize if we haven't started the process
    if (!initializationPromiseRef.current) {
      initializationPromiseRef.current = initializePayment();
    }

    return () => {
      // Cleanup can stay empty as we want to keep the promise ref
      // until component is fully unmounted
    };
  }, [createInitialOrder, onError]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <span className="ml-2">Processing payment...</span>
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

  if (!clientSecret) {
    return (
      <div className="text-red-600 p-4 bg-red-50 rounded-md">
        Failed to initialize payment. Please try again.
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentForm onSuccess={onSuccess} onError={onError} />
    </Elements>
  );
} 