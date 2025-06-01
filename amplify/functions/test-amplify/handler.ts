import type { APIGatewayProxyHandler } from "aws-lambda";
import { generateClient } from 'aws-amplify/data';
import { Amplify } from 'aws-amplify';
import type { Schema } from '../../data/resource.js';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
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
      AMPLIFY_DATA_DEFAULT_NAME: env.AMPLIFY_DATA_DEFAULT_NAME
    });
    
    const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
    
    console.log('Got Amplify data client config:', {
      resourceConfig,
      libraryOptions
    });
    
    Amplify.configure(resourceConfig, libraryOptions);
    console.log('Amplify configured successfully');
    
    const client = generateClient<Schema>();
    console.log('Amplify client generated successfully');

    // Test the connection with a simple query
    const { data, errors } = await client.models.Restaurant.list();
    
    if (errors) {
      console.error('Query test failed:', errors);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Query test failed', 
          details: errors,
          config: { resourceConfig, libraryOptions }
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'Amplify initialization and query test successful',
        data: data,
        config: { resourceConfig, libraryOptions }
      }),
    };
  } catch (error) {
    console.error('Error in Amplify initialization test:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Amplify initialization test failed', 
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }),
    };
  }
}; 