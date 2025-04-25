import { AdminCreateUserCommand, AdminSetUserPasswordCommand, CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import outputs from '../amplify_outputs.json';

// Get user pool ID from amplify_outputs.json
const userPoolId = outputs.auth.user_pool_id;
const region = outputs.auth.aws_region;

// User details
const username = 'justin@thevessale.com'; // Change this to your testing email
const password = 'Test123!'; // Temporary test password (should meet Cognito requirements)

// Create Cognito client
const cognitoClient = new CognitoIdentityProviderClient({ 
  region: region
});

async function createAndVerifyUser() {
  try {
    console.log(`Creating user ${username} in pool ${userPoolId}...`);
    
    // Step 1: Create the user
    const createUserCommand = new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: username,
      TemporaryPassword: 'Temp123!', // Initial temp password
      MessageAction: 'SUPPRESS', // Don't send welcome email
      UserAttributes: [
        {
          Name: 'email',
          Value: username
        },
        {
          Name: 'email_verified',
          Value: 'true'  // Pre-verify the email
        }
      ]
    });
    
    try {
      const createResponse = await cognitoClient.send(createUserCommand);
      console.log('User created successfully:', createResponse.User?.Username);
    } catch (error: any) {
      if (error.name === 'UsernameExistsException') {
        console.log('User already exists, proceeding to set password...');
      } else {
        throw error;
      }
    }
    
    // Step 2: Set a permanent password (skips the force change password challenge)
    const setPasswordCommand = new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: username,
      Password: password,
      Permanent: true // This makes it a permanent password
    });
    
    const passwordResponse = await cognitoClient.send(setPasswordCommand);
    console.log('Password set successfully');
    
    console.log(`✅ User ${username} is ready for testing`);
    console.log(`✅ Use password: ${password}`);
  } catch (error) {
    console.error('Error creating test user:', error);
  }
}

createAndVerifyUser(); 