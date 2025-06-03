import type { APIGatewayProxyHandler } from "aws-lambda";
import type { Schema } from '../../data/resource';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/test-amplify';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);

Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>();

export const handler: APIGatewayProxyHandler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  };

  try {
    console.log('Testing Amplify function with official documentation pattern');

    // Test a simple query to verify the client works
    console.log('Testing client with a Restaurant query...');
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
          message: 'Query failed',
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
        message: 'Amplify Lambda function test successful using official pattern',
        restaurantCount: restaurants?.length || 0,
        timestamp: new Date().toISOString()
      }),
    };

  } catch (error) {
    console.error('Error in Amplify test:', error);
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