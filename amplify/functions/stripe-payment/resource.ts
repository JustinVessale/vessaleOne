import { defineFunction, secret } from "@aws-amplify/backend";

export const stripePayment = defineFunction({
  name: "stripe-payment",
  environment: {
    STRIPE_SECRET_KEY: secret('VITE_STRIPE_SECRET_KEY'),
    STRIPE_WEBHOOK_SECRET: secret('STRIPE_WEBHOOK_SECRET'),
    AMPLIFY_DATA_DEFAULT_NAME: 'default'
  },
  resourceGroupName: 'data'
}); 