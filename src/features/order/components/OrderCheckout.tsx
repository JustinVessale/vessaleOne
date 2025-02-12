import { CheckoutContainer } from '@/features/payment/components/CheckoutContainer';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { StripeError } from '@stripe/stripe-js';
import { type Order } from '@/features/order/types';

type OrderCheckoutProps = {
  order: Order;
};

export function OrderCheckout({ order }: OrderCheckoutProps) {
  const { toast } = useToast();
  const router = useRouter();

  // Can use the paymentIntentId to fetch the payment intent from the database
  const handlePaymentSuccess = (_paymentIntent: any) => {
    toast({
      title: 'Payment successful',
      description: 'Your order has been placed successfully!',
    });
    router.push(`/orders/${order.id}`);
  };

  const handlePaymentError = (error: StripeError) => {
    toast({
      title: 'Payment failed',
      description: error.message,
      variant: 'destructive',
    });
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <CheckoutContainer
        order={order}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
      />
    </div>
  );
} 