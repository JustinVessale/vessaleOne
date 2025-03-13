import { defineBackend } from '@aws-amplify/backend';
import { data } from './data/resource';
import { auth } from './auth/resource';
import { Stack } from "aws-cdk-lib";
import {
  AuthorizationType,
  Cors,
  LambdaIntegration,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import { stripePayment } from "./functions/stripe-payment/resource";
import { nashWebhook } from "./functions/nash-webhook/resource";
import { secret } from '@aws-amplify/backend';

export const backend = defineBackend({
  auth,
  data,
  stripePayment,
  nashWebhook
});

// Add secrets to the Lambda functions
backend.stripePayment.addEnvironment('STRIPE_SECRET_KEY', secret('STRIPE_SECRET_KEY'));
backend.stripePayment.addEnvironment('STRIPE_WEBHOOK_SECRET', secret('STRIPE_WEBHOOK_SECRET'));
backend.nashWebhook.addEnvironment('NASH_WEBHOOK_SECRET', secret('NASH_WEBHOOK_SECRET'));
backend.nashWebhook.addEnvironment('API_KEY', secret('AMPLIFY_API_KEY'));

// Create API stack
const apiStack = backend.createStack("api-stack");

// Create REST API
const paymentApi = new RestApi(apiStack, "PaymentApi", {
  restApiName: "payment-api",
  deploy: true,
  deployOptions: {
    stageName: process.env.AMPLIFY_ENV || 'dev', // Will be 'dev', 'prod', etc. based on the branch
  },
  defaultCorsPreflightOptions: {
    allowOrigins: [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://*.amplifyapp.com' // TODO: Change to the production domain
      // ...(process.env.AMPLIFY_ENV === 'prod' 
      //   ? ['https://your-production-domain.com'] 
      //   : ['https://develop.d2g0w15slq5y17.amplifyapp.com', 'https://*.d2g0w15slq5y17.amplifyapp.com'])
    ],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: [
      'Content-Type',
      'X-Amz-Date',
      'Authorization',
      'X-Api-Key',
      'X-Amz-Security-Token',
      'stripe-signature',
      'svix-id',
      'svix-timestamp',
      'svix-signature'
    ],
    allowCredentials: true
  },
});

// Create Lambda integrations
const paymentIntegration = new LambdaIntegration(
  backend.stripePayment.resources.lambda
);

const nashWebhookIntegration = new LambdaIntegration(
  backend.nashWebhook.resources.lambda
);

// Add payment endpoint
const paymentPath = paymentApi.root.addResource("create-payment-intent");
paymentPath.addMethod("POST", paymentIntegration);

// Add webhook endpoints
const webhookRoot = paymentApi.root.addResource("webhook");

// Stripe webhook
const stripeWebhook = webhookRoot.addResource("stripe");
stripeWebhook.addMethod("POST", paymentIntegration, {
  apiKeyRequired: false // Stripe needs to call this endpoint directly
});

// Nash webhook
const nashWebhookPath = webhookRoot.addResource("nash");
nashWebhookPath.addMethod("POST", nashWebhookIntegration, {
  apiKeyRequired: false // Nash needs to call this endpoint directly
});

// Add outputs to configuration
backend.addOutput({
  custom: {
    API: {
      [paymentApi.restApiName]: {
        endpoint: paymentApi.url,
        region: Stack.of(paymentApi).region,
        apiName: paymentApi.restApiName,
      },
    },
  },
});
