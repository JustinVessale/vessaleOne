
import Stripe from 'stripe';
// Get the appropriate publishable key based on the environment
const getPublishableKey = () => {
  const isProd = import.meta.env.PROD === true;
  return isProd 
    ? import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_PROD
    : import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_DEV;
};

// Initialize Stripe with the appropriate API version -> Use for server-side Stripe operations
export const createStripe = () => {
  const key = import.meta.env.VITE_STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('Missing Stripe secret key environment variable');
  }
  return new Stripe(key, {
    apiVersion: '2025-01-27.acacia',
  });
};

export const STRIPE_PUBLISHABLE_KEY = getPublishableKey();
if (!STRIPE_PUBLISHABLE_KEY) {
  throw new Error('Missing Stripe publishable key environment variable');
}

export const STRIPE_OPTIONS = {
  appearance: {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#0f172a',
      colorBackground: '#ffffff',
      colorText: '#0f172a',
      colorDanger: '#df1b41',
    },
  },
}; 