import { defineFunction } from '@aws-amplify/backend';

export const nashWebhook = defineFunction({
  name: 'nash-webhook',
  environment: {
    // Add any environment variables needed for the webhook
    NASH_WEBHOOK_SECRET: process.env.NASH_WEBHOOK_SECRET || ''
  },
  resourceGroupName: 'data'
});
