

// Get the appropriate publishable key based on the environment
const getPublishableKey = () => {
  const isProd = import.meta.env.PROD === true;
  return isProd 
    ? import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_PROD
    : import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_DEV;
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