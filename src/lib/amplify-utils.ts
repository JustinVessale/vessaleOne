import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../amplify/data/resource';

export function generateServerClient() {
  return generateClient<Schema>({
    authMode: 'apiKey',
  });
}