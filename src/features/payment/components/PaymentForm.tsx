import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { StripeError } from '@stripe/stripe-js';

type PaymentFormProps = {
  onPaymentSuccess: (paymentIntent: any) => void;
  onPaymentError: (error: StripeError) => void;
  amount: number;
};

export function PaymentForm({ onPaymentSuccess, onPaymentError, amount }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        onPaymentError(error as StripeError);
      } else if (paymentIntent) {
        onPaymentSuccess(paymentIntent);
      }
    } catch (e) {
      onPaymentError(e as StripeError);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full"
      >
        {isProcessing ? 'Processing...' : `Pay $${(amount / 100).toFixed(2)}`}
      </Button>
    </form>
  );
} 