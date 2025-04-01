import { defineAuth } from '@aws-amplify/backend';

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true, // Use default email configuration for simplicity
  },
  // Disable MFA
  multifactor: {
    mode: 'OFF'
  },
  // Basic email sender configuration
  senders: {
    email: {
      fromEmail: 'noreply@example.com',
      fromName: 'Restaurant Portal',
    }
  }
});
