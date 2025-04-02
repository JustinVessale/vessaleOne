# Seed Develop Environment Lambda

This Lambda function seeds the develop environment with initial restaurant data and creates a verified Cognito user. It combines the functionality of the local `seed-data.ts` and `create-test-user.ts` scripts into a single function that can be executed directly in the deployed environment.

## Purpose

The function automates the setup of the develop environment by:

1. Creating a restaurant record with all necessary configuration
2. Adding staff members associated with the restaurant
3. Creating menu categories and menu items
4. Creating and verifying a Cognito user for testing

## Usage

### Deploying the Function

First, deploy the function to your develop environment:

```bash
npx ampx deploy
```

### Running the Function

After deployment, you can invoke the function using the AWS CLI:

```bash
aws lambda invoke \
  --function-name seed-develop-develop \
  --payload '{}' \
  output.json
```

Or use the AWS Management Console:

1. Navigate to AWS Lambda
2. Find the function `seed-develop-develop`
3. Click "Test" with an empty event payload `{}`

### Verifying Results

After running the function:

1. Check the Lambda execution logs for details about what was created
2. The function returns the restaurant ID, owner email, and password in its response
3. You can log in to the application using:
   - Email: justin@thevessale.com 
   - Password: Test123!

## Customization

If you need to modify the restaurant data or user credentials:

1. Edit the `handler.ts` file in this directory
2. Update the `restaurantData` object or user information
3. Redeploy the function

## Troubleshooting

If the function fails:

1. Check the CloudWatch logs for detailed error messages
2. Ensure the function has the necessary permissions to create users
3. Verify that all secrets (`AMPLIFY_API_KEY`) are properly set in the Amplify environment

## Security Note

This function creates a user with a known password intended for development testing only. For production environments, ensure:

1. This function is not deployed to production
2. Test users are removed or have their passwords changed before launch
3. Secrets are properly managed and rotated 