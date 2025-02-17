import { useEffect, useState } from 'react';
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
  let orderAttempts = 0;
  let paymentAttempts = 0;
  const MAX_ATTEMPTS = 3;
  let isSubscribed = true; // For cleanup

  useEffect(() => {


    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const createPaymentIntentWithRetry = async (params: { orderId: string; total: number; restaurantId: string }) => {
      if (paymentAttempts >= MAX_ATTEMPTS) {
        throw new Error(`Failed to create payment intent after ${MAX_ATTEMPTS} attempts`);
      }

      try {
        paymentAttempts++;
        if (paymentAttempts > 1) {
          await sleep(Math.pow(2, paymentAttempts - 2) * 1000);
        }

        console.log(`Creating payment intent (attempt ${paymentAttempts})...`);
        const { clientSecret } = await createPaymentIntent(params);
        return clientSecret;
      } catch (error) {
        console.error(`Payment intent creation failed (attempt ${paymentAttempts}/${MAX_ATTEMPTS}):`, error);
        return createPaymentIntentWithRetry(params);
      }
    };

    const initializePayment = async () => {
      if (orderAttempts >= MAX_ATTEMPTS) {
        onError(new Error(`Failed to initialize payment after ${MAX_ATTEMPTS} attempts`));
        return;
      }

      try {
        orderAttempts++;
        if (orderAttempts > 1) {
          await sleep(Math.pow(2, orderAttempts - 2) * 1000);
        }

        // Create the order first
        const newOrder = await createInitialOrder();
        if (!newOrder) {
          throw new Error('Failed to create order');
        }
        
        if (!isSubscribed) return; // Check if component is still mounted
        setOrder(newOrder);

        // Then create the payment intent
        const params = {
          orderId: newOrder.id,
          total: newOrder.total ?? 0,
          restaurantId: newOrder.restaurantId ?? ''
        };
        
        const clientSecret = await createPaymentIntentWithRetry(params);
        if (!isSubscribed) return; // Check if component is still mounted
        setClientSecret(clientSecret);
      } catch (error) {
        console.error(`Error initializing payment (attempt ${orderAttempts}/${MAX_ATTEMPTS}):`, error);
        if (orderAttempts < MAX_ATTEMPTS) {
          await initializePayment();
        } else {
          onError(error);
        }
      }
    };

    initializePayment();

    // Cleanup function
    return () => {
      isSubscribed = false;
    };
  }, [createInitialOrder, onError]);

  if (!clientSecret || !order) {
    return <div>Loading...</div>;
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentForm onSuccess={onSuccess} onError={onError} />
    </Elements>
  );
} 