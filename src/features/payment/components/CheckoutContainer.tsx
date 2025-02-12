import { useQuery } from '@tanstack/react-query';
import { StripeProvider } from './StripeProvider';
import { PaymentForm } from './PaymentForm';
import { createPaymentIntent } from '../api/checkoutService';
import { type Order } from '@/features/order/types';
import { StripeError } from '@stripe/stripe-js';

type CheckoutContainerProps = {
  order: Order;
  onSuccess: (paymentIntent: any) => void;
  onError: (error: StripeError) => void;
};

export function CheckoutContainer({ order, onSuccess, onError }: CheckoutContainerProps) {
  const { data: paymentIntent, isLoading, error } = useQuery({
    queryKey: ['payment-intent', order.id],
    queryFn: () => createPaymentIntent(order),
    enabled: !!order,
  });

  if (isLoading) {
    return <div>Loading payment form...</div>;
  }

  if (error) {
    return <div>Error loading payment form</div>;
  }

  return (
    <StripeProvider clientSecret={paymentIntent?.clientSecret}>
      <PaymentForm
        amount={order.total}
        onPaymentSuccess={onSuccess}
        onPaymentError={onError}
      />
    </StripeProvider>
  );
} 