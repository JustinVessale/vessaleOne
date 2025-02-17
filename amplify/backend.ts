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

export const backend = defineBackend({
  auth,
  data,
  stripePayment
});

// Create API stack
const apiStack = backend.createStack("api-stack");

// Create REST API
const paymentApi = new RestApi(apiStack, "PaymentApi", {
  restApiName: "payment-api",
  deploy: true,
  deployOptions: {
    stageName: "dev",
  },
  defaultCorsPreflightOptions: {
    allowOrigins: [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://*.amplifyapp.com'  // This will allow all Amplify app domains
    ],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: [
      'Content-Type',
      'X-Amz-Date',
      'Authorization',
      'X-Api-Key',
      'X-Amz-Security-Token',
      'stripe-signature'
    ],
    allowCredentials: true
  },
});

// Create Lambda integration
const paymentIntegration = new LambdaIntegration(
  backend.stripePayment.resources.lambda
);

// Add payment endpoint
const paymentPath = paymentApi.root.addResource("create-payment-intent");
paymentPath.addMethod("POST", paymentIntegration);

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
