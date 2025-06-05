// Platform configuration
export const PLATFORM_CONFIG = {
  SERVICE_FEE: 2.29, // $2.29 platform service fee
  SERVICE_FEE_CENTS: 229, // $2.29 in cents for Stripe
  PROCESSING_FEE_PERCENTAGE: 0.029, // 2.9% processing fee on total order amount
  // Note: Service fee, delivery fee, and processing fee are all sent to platform via Stripe application_fee_amount
  // Platform handles paying delivery partners (Nash) separately
} as const;

// Delivery configuration
export const DELIVERY_CONFIG = {
  DEFAULT_PROVIDER: 'Nash',
} as const; 