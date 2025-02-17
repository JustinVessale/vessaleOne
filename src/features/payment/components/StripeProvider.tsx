import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { STRIPE_PUBLISHABLE_KEY, STRIPE_OPTIONS } from '@/config/stripe';
import { type StripeElementsOptions } from '@stripe/stripe-js';

const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

type StripeProviderProps = {
  children: React.ReactNode;
  clientSecret?: string;
};

export function StripeProvider({ children, clientSecret }: StripeProviderProps) {
  const options: StripeElementsOptions = clientSecret ? {
    ...STRIPE_OPTIONS,
      clientSecret,
    }
  : STRIPE_OPTIONS;

  return (
    <Elements 
      stripe={stripePromise} 
      options={options}
    >
      {children}
    </Elements>
  );
} 