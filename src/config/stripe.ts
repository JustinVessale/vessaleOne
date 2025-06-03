import Stripe from 'stripe';
// Get the appropriate publishable key based on the environment
const getPublishableKey = () => {
  // Check if we're in a development environment
  const isDev = import.meta.env.MODE === 'development' || 
                window.location.hostname === 'localhost' ||
                window.location.hostname.includes('develop.d2g0w15slq5y17.amplifyapp.com');
  
  // Always use test keys in development environments
  const isProd = !isDev && import.meta.env.PROD === true;
  
  console.log('Stripe config - Environment check:', {
    isDev,
    isProd,
    hostname: window.location.hostname,
    PROD: import.meta.env.PROD,
    MODE: import.meta.env.MODE,
    devKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_DEV,
    prodKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_PROD
  });
  
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
    apiVersion: '2025-04-30.basil',
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