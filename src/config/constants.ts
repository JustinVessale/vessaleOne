// Platform configuration
export const PLATFORM_CONFIG = {
  SERVICE_FEE: 1.99, // $1.99 platform service fee
  SERVICE_FEE_CENTS: 199, // $1.99 in cents for Stripe
} as const;

// Delivery configuration
export const DELIVERY_CONFIG = {
  DEFAULT_PROVIDER: 'Nash',
} as const; 