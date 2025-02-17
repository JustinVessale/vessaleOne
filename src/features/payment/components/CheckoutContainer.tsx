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
  const [isInitializing, setIsInitializing] = useState(false);  // Add loading state
  
  const orderAttemptsRef = useRef(0);
  const paymentAttemptsRef = useRef(0);
  const isSubscribedRef = useRef(true);
  const MAX_ATTEMPTS = 3;

  useEffect(() => {
    // Guard against multiple initialization attempts
    if (isInitializing || clientSecret || order) {
      return;
    }

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const createPaymentIntentWithRetry = async (params: { orderId: string; total: number; restaurantId: string }) => {
      if (paymentAttemptsRef.current >= MAX_ATTEMPTS) {
        throw new Error(`Failed to create payment intent after ${MAX_ATTEMPTS} attempts`);
      }

      try {
        paymentAttemptsRef.current++;
        if (paymentAttemptsRef.current > 1) {
          await sleep(Math.pow(2, paymentAttemptsRef.current - 2) * 1000);
        }

        console.log(`Creating payment intent (attempt ${paymentAttemptsRef.current})...`);
        const { clientSecret } = await createPaymentIntent(params);
        return clientSecret;
      } catch (error) {
        console.error(`Payment intent creation failed (attempt ${paymentAttemptsRef.current}/${MAX_ATTEMPTS}):`, error);
        return createPaymentIntentWithRetry(params);
      }
    };

    const initializePayment = async () => {
      if (orderAttemptsRef.current >= MAX_ATTEMPTS) {
        onError(new Error(`Failed to initialize payment after ${MAX_ATTEMPTS} attempts`));
        return;
      }

      setIsInitializing(true);  // Set loading state
      try {
        orderAttemptsRef.current++;
        if (orderAttemptsRef.current > 1) {
          await sleep(Math.pow(2, orderAttemptsRef.current - 2) * 1000);
        }

        // Create the order first
        const newOrder = await createInitialOrder();
        if (!newOrder) {
          throw new Error('Failed to create order');
        }
        
        if (!isSubscribedRef.current) return; // Check if component is still mounted
        setOrder(newOrder);

        // Then create the payment intent
        const params = {
          orderId: newOrder.id,
          total: newOrder.total ?? 0,
          restaurantId: newOrder.restaurantId ?? ''
        };
        
        const clientSecret = await createPaymentIntentWithRetry(params);
        if (!isSubscribedRef.current) return; // Check if component is still mounted
        setClientSecret(clientSecret);
      } catch (error) {
        console.error(`Error initializing payment (attempt ${orderAttemptsRef.current}/${MAX_ATTEMPTS}):`, error);
        if (orderAttemptsRef.current < MAX_ATTEMPTS) {
          await initializePayment();
        } else {
          onError(error);
        }
      } finally {
        setIsInitializing(false);  // Reset loading state
      }
    };

    initializePayment();

    return () => {
      isSubscribedRef.current = false;
    };
  }, [createInitialOrder, onError, clientSecret, order, isInitializing]);  // Add dependencies

  if (!clientSecret || !order) {
    return <div>Loading...</div>;
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentForm onSuccess={onSuccess} onError={onError} />
    </Elements>
  );
} 