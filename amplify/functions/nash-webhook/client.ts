import { generateClient } from '@aws-amplify/api';
import { Amplify } from 'aws-amplify';
import type { Schema } from '../../../amplify/data/resource';

export function createClient() {
  // Use AMPLIFY_API_KEY instead of API_KEY to match the secret name
  const apiKey = process.env.AMPLIFY_API_KEY || process.env.API_KEY;
  const region = process.env.REGION || 'us-east-2';
  const apiId = process.env.API_ID;
  const apiEndpoint = process.env.API_ENDPOINT;
  
  console.log('Environment variables:');
  console.log('- API_KEY:', apiKey ? 'Present (hidden)' : 'Missing');
  console.log('- API_ID:', apiId || 'Missing');
  console.log('- API_ENDPOINT:', apiEndpoint || 'Missing');
  console.log('- REGION:', region);
  
  if (!apiKey) {
    throw new Error('API key not found in environment variables');
  }
  
  let endpoint;
  if (apiEndpoint) {
    endpoint = apiEndpoint;
  } else if (apiId) {
    endpoint = `https://${apiId}.appsync-api.${region}.amazonaws.com/graphql`;
  } else {
    throw new Error('Either API_ID or API_ENDPOINT must be provided in environment variables');
  }
  
  // Configure Amplify with the GraphQL endpoint
  try {
    console.log('Configuring Amplify with endpoint:', endpoint);
    
    Amplify.configure({
      API: {
        GraphQL: {
          endpoint,
          region,
          apiKey,
          defaultAuthMode: 'apiKey'
        }
      }
    });
    console.log('Amplify successfully configured');
  } catch (error) {
    console.error('Error configuring Amplify:', error);
    throw error;
  }
  
  return generateClient<Schema>({
    authMode: 'apiKey',
    apiKey
  });
} 