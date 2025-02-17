import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { StripeError, PaymentIntent } from '@stripe/stripe-js';

export type PaymentFormProps = {
  onSuccess: (paymentIntent: PaymentIntent) => Promise<void>;
  onError: (error: StripeError) => void;
};

export function PaymentForm({ onSuccess, onError }: PaymentFormProps) {
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
        onError(error);
      } else if (paymentIntent) {
        await onSuccess(paymentIntent);
      }
    } catch (e) {
      onError(e as StripeError);
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
        {isProcessing ? 'Processing...' : 'Pay'}
      </Button>
    </form>
  );
} 