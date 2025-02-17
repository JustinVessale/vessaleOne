import { defineFunction } from "@aws-amplify/backend";

export const stripePayment = defineFunction({
  name: "stripe-payment",
  environment: {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
    STRIPE_WEBHOOK_SECRET: process.env.VITE_STRIPE_WEBHOOK_SECRET || ''
  }
}); 