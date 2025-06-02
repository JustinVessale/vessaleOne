import type { APIGatewayProxyHandler } from "aws-lambda";
import { generateClient } from 'aws-amplify/data';
import { Amplify } from 'aws-amplify';
import type { Schema } from '../../data/resource.js';
import { env } from '$amplify/env/test-amplify.js';

export const handler: APIGatewayProxyHandler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  };

  try {
    console.log('Starting Amplify initialization test with environment:', {
      API_ID: env.API_ID,
      API_ENDPOINT: env.API_ENDPOINT,
      REGION: env.REGION,
      AMPLIFY_DATA_API_KEY: env.AMPLIFY_DATA_API_KEY ? '***' : undefined,
      AMPLIFY_DATA_DEFAULT_NAME: env.AMPLIFY_DATA_DEFAULT_NAME
    });

    // Simplified Amplify configuration using apiKey mode (like seed-develop handler)
    console.log('Configuring Amplify with apiKey mode...');
    Amplify.configure({
      API: {
        GraphQL: {
          endpoint: env.API_ENDPOINT,
          region: env.REGION,
          defaultAuthMode: 'apiKey',
          apiKey: env.AMPLIFY_DATA_API_KEY
        }
      }
    });
    console.log('Amplify configured successfully');

    console.log('Generating client...');
    const client = generateClient<Schema>();
    console.log('Client generated successfully');

    // Test a simple query to verify the client works
    console.log('Testing client with a simple query...');
    const { data: restaurants, errors } = await client.models.Restaurant.list({
      limit: 1
    });

    if (errors) {
      console.error('Query errors:', errors);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Amplify client configured but query failed',
          errors: errors
        }),
      };
    }

    console.log('Test query successful, found', restaurants?.length || 0, 'restaurants');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Amplify client initialized and tested successfully',
        restaurantCount: restaurants?.length || 0,
        timestamp: new Date().toISOString()
      }),
    };

  } catch (error) {
    console.error('Error in Amplify initialization test:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }),
    };
  }
}; 