import { generateClient } from '@aws-amplify/api';
import type { Schema } from '../../../amplify/data/resource';

export function createClient() {
  // Use AMPLIFY_API_KEY instead of API_KEY to match the secret name
  const apiKey = process.env.AMPLIFY_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    console.error('API key not found in environment variables');
  }
  
  return generateClient<Schema>({
    authMode: 'apiKey',
    apiKey: apiKey
  });
} 