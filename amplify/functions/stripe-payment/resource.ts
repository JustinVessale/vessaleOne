import { defineFunction, secret } from "@aws-amplify/backend";

export const stripePayment = defineFunction({
  name: "stripe-payment",
  environment: {
    STRIPE_SECRET_KEY: secret('STRIPE_SECRET_KEY'),
    STRIPE_WEBHOOK_SECRET: secret('STRIPE_WEBHOOK_SECRET'),
    APP_URL: process.env.APP_URL || 'http://localhost:5173'
  }
}); 