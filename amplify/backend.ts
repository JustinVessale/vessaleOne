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
import { Duration } from 'aws-cdk-lib';
import { Function } from 'aws-cdk-lib/aws-lambda';

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

// Add the API_ID and API_ENDPOINT environment variables for the Nash webhook Lambda
// This is needed to configure Amplify correctly in the Lambda environment
backend.nashWebhook.addEnvironment('API_ID', backend.data.resources.graphqlApi.apiId);
// Construct the endpoint URL manually since 'endpoint' property isn't directly accessible
backend.nashWebhook.addEnvironment('API_ENDPOINT', `https://${backend.data.resources.graphqlApi.apiId}.appsync-api.${Stack.of(backend.data.resources.graphqlApi).region}.amazonaws.com/graphql`);
backend.nashWebhook.addEnvironment('REGION', Stack.of(backend.data.resources.graphqlApi).region);

// Let the Lambda function know we want more memory and a longer timeout
// We can't directly set the CDK properties, so we'll send it via environment variables
// The Lambda resource will need to handle these settings during execution
backend.nashWebhook.addEnvironment('DESIRED_MEMORY_SIZE', '512');
backend.nashWebhook.addEnvironment('DESIRED_TIMEOUT_SECONDS', '30');

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
