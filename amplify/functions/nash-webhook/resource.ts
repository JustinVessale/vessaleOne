import { defineFunction } from '@aws-amplify/backend';
import { data } from '../../data/resource';

export const nashWebhook = defineFunction({
  name: 'nash-webhook',
  environment: {
    // Add any environment variables needed for the webhook
    NASH_WEBHOOK_SECRET: process.env.NASH_WEBHOOK_SECRET || ''
  },
  resourceGroupName: 'data'
});
