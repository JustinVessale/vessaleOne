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
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    // Prevent multiple initialization attempts
    if (hasInitializedRef.current) {
      return;
    }

    async function initializePayment() {
      try {
        hasInitializedRef.current = true;
        
        // Create the order first
        const newOrder = await createInitialOrder();
        if (!newOrder) {
          console.log('Order creation failed, stopping payment flow');
          setIsLoading(false);
          return;
        }
        
        setOrder(newOrder);
        
        try {
          // Only proceed with payment intent if we have an order
          const params = {
            orderId: newOrder.id,
            total: newOrder.total ?? 0,
            restaurantId: newOrder.restaurantId ?? ''
          };
          
          const { clientSecret } = await createPaymentIntent(params);
          setClientSecret(clientSecret);
        } catch (paymentError) {
          console.error('Payment intent creation failed:', paymentError);
          onError(paymentError);
        }
      } catch (error) {
        console.error('Error initializing payment:', error);
        onError(error);
      } finally {
        setIsLoading(false);
      }
    }

    initializePayment();

    return () => {
      hasInitializedRef.current = false;
    };
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Show error state if we don't have an order
  if (!order) {
    return <div>Failed to create order. Please try again.</div>;
  }

  if (!clientSecret) {
    return <div>Something went wrong. Please try again.</div>;
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentForm onSuccess={onSuccess} onError={onError} />
    </Elements>
  );
} 