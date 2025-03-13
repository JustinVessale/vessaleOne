import { generateClient } from '@aws-amplify/api';
import type { Schema } from '../../../amplify/data/resource';

export function createClient() {
  return generateClient<Schema>({
    authMode: 'apiKey',
    apiKey: process.env.API_KEY
  });
} 