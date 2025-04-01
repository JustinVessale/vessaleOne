import { AdminConfirmSignUpCommand, CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import outputs from '../amplify_outputs.json';

// Get user pool ID from amplify_outputs.json
const userPoolId = outputs.auth.user_pool_id;
const region = outputs.auth.aws_region;

// User to verify
const username = 'owner@worldfamousgrill.com'; // Change this to the email you used

// Create Cognito client
const cognitoClient = new CognitoIdentityProviderClient({ 
  region: region
});

async function verifyUser() {
  try {
    console.log(`Attempting to verify user ${username} in pool ${userPoolId}...`);
    
    const command = new AdminConfirmSignUpCommand({
      UserPoolId: userPoolId,
      Username: username
    });
    
    const response = await cognitoClient.send(command);
    console.log('User verified successfully:', response);
  } catch (error) {
    console.error('Error verifying user:', error);
  }
}

verifyUser(); 