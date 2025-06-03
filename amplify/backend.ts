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
import { seedDevelop } from "./functions/seed-develop/resource";
import { testAmplify } from "./functions/test-amplify/resource";
import { secret } from '@aws-amplify/backend';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { storage } from './storage/resource';

export const backend = defineBackend({
  auth,
  data,
  stripePayment,
  nashWebhook,
  seedDevelop,
  testAmplify,
  storage
});


// Add API configuration for the stripe-payment Lambda - FIXED VERSION
backend.stripePayment.addEnvironment('API_ID', backend.data.resources.graphqlApi.apiId);
backend.stripePayment.addEnvironment('API_ENDPOINT', `https://${backend.data.resources.graphqlApi.apiId}.appsync-api.${Stack.of(backend.data.resources.graphqlApi).region}.amazonaws.com/graphql`);
backend.stripePayment.addEnvironment('REGION', Stack.of(backend.data.resources.graphqlApi).region);
backend.stripePayment.addEnvironment('AMPLIFY_DATA_DEFAULT_NAME', 'default');

// Add necessary permissions for the stripe-payment Lambda
backend.stripePayment.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'dynamodb:GetItem',
      'dynamodb:PutItem',
      'dynamodb:UpdateItem',
      'dynamodb:Query',
      'dynamodb:Scan',
      'appsync:GraphQL'
    ],
    resources: [
      `${backend.data.resources.tables.Order.tableArn}`,
      `${backend.data.resources.tables.OrderItem.tableArn}`,
      `${backend.data.resources.tables.Restaurant.tableArn}`,
      `${backend.data.resources.tables.MenuItem.tableArn}`,
      `${backend.data.resources.graphqlApi.arn}/*`
    ]
  })
);

backend.nashWebhook.addEnvironment('NASH_API_KEY', secret('NASH_API_KEY'));
backend.nashWebhook.addEnvironment('NASH_ORG_ID', secret('NASH_ORG_ID'));
backend.nashWebhook.addEnvironment('NASH_WEBHOOK_SECRET', secret('NASH_WEBHOOK_SECRET'));

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

// Configure the seed-develop function
backend.seedDevelop.addEnvironment('USER_POOL_ID', backend.auth.resources.userPool.userPoolId);
backend.seedDevelop.addEnvironment('REGION', Stack.of(backend.data.resources.graphqlApi).region);
backend.seedDevelop.addEnvironment('API_ID', backend.data.resources.graphqlApi.apiId);
backend.seedDevelop.addEnvironment('API_ENDPOINT', `https://${backend.data.resources.graphqlApi.apiId}.appsync-api.${Stack.of(backend.data.resources.graphqlApi).region}.amazonaws.com/graphql`);
backend.seedDevelop.addEnvironment('API_KEY', secret('AMPLIFY_API_KEY'));

// Grant permission to interact with Cognito user pool
backend.seedDevelop.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'cognito-idp:AdminCreateUser',
      'cognito-idp:AdminSetUserPassword'
    ],
    resources: [backend.auth.resources.userPool.userPoolArn]
  })
);

// Configure test-amplify function
backend.testAmplify.addEnvironment('API_ID', backend.data.resources.graphqlApi.apiId);
backend.testAmplify.addEnvironment('API_ENDPOINT', `https://${backend.data.resources.graphqlApi.apiId}.appsync-api.${Stack.of(backend.data.resources.graphqlApi).region}.amazonaws.com/graphql`);
backend.testAmplify.addEnvironment('REGION', Stack.of(backend.data.resources.graphqlApi).region);

// Create API stack
const apiStack = backend.createStack("api-stack");

// Create REST API
const paymentApi = new RestApi(apiStack, "PaymentApi", {
  restApiName: "payment-api",
  deploy: true,
  deployOptions: {
    stageName: process.env.AMPLIFY_ENV || 'dev',
  },
  defaultCorsPreflightOptions: {
    allowOrigins: [
      'http://localhost:5173',
      'https://develop.d2g0w15slq5y17.amplifyapp.com', // Explicit develop domain
      'https://main.d2g0w15slq5y17.amplifyapp.com',    // Explicit main domain
      'https://*.amplifyapp.com',                     // Generic pattern for other environments
      'https://*.thevessale.com',                     // Production domain
      'https://thevessale.com',                       // Root domain
      'https://www.orderthevessale.com'               // Additional domain
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
const stripeWebhookIntegration = new LambdaIntegration(
  backend.stripePayment.resources.lambda
);

const nashWebhookIntegration = new LambdaIntegration(
  backend.nashWebhook.resources.lambda
);

// Add webhook endpoints
const webhookPath = paymentApi.root.addResource("webhook");
webhookPath.addMethod("POST", stripeWebhookIntegration);

const nashWebhookPath = paymentApi.root.addResource("nash-webhook");
nashWebhookPath.addMethod("POST", nashWebhookIntegration);

// Add create-checkout-session endpoint
const checkoutSessionPath = paymentApi.root.addResource("create-checkout-session");
checkoutSessionPath.addMethod("POST", stripeWebhookIntegration);

// Add test-amplify endpoint
const testAmplifyPath = paymentApi.root.addResource("test-amplify");
testAmplifyPath.addMethod("GET", new LambdaIntegration(backend.testAmplify.resources.lambda));

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