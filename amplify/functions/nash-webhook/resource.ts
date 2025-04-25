import { defineFunction, secret } from '@aws-amplify/backend';

export const nashWebhook = defineFunction({
  name: 'nash-webhook',
  environment: {
    NASH_WEBHOOK_SECRET: secret('NASH_WEBHOOK_SECRET'),
    NASH_API_KEY: secret('NASH_API_KEY'),
    NASH_ORG_ID: secret('NASH_ORG_ID')
  },
  resourceGroupName: 'data'
});
