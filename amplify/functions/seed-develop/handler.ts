/**
 * Seed Develop Environment Lambda
 * 
 * This Lambda function seeds the develop environment with initial restaurant data
 * and creates a verified Cognito user. It combines the functionality of the local
 * seed-data.ts and create-test-user.ts scripts.
 * 
 * To invoke this Lambda:
 * 1. Deploy it with `npx ampx deploy`
 * 2. Invoke it from the AWS Console or CLI:
 *    aws lambda invoke --function-name seed-develop-{env} --payload '{}' output.json
 */

import { Handler } from 'aws-lambda';
import { generateClient } from 'aws-amplify/api';
import { type Schema } from '../../data/resource';
import { Amplify } from 'aws-amplify';
import { AdminCreateUserCommand, AdminSetUserPasswordCommand, CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

// Configure Amplify with the API settings
const endpoint = process.env.API_ENDPOINT;
const region = process.env.REGION;
const apiKey = process.env.API_KEY;

if (!endpoint || !region || !apiKey) {
  throw new Error('Missing required environment variables: API_ENDPOINT, REGION, and API_KEY must be set');
}

// Log configuration for debugging (mask sensitive values)
console.log('Configuration:', {
  endpoint,
  region,
  apiKey: apiKey ? '***' : undefined
});

// Configure Amplify
Amplify.configure({
  API: {
    GraphQL: {
      endpoint,
      region,
      defaultAuthMode: 'apiKey',
      apiKey
    }
  }
});

// Generate the client AFTER configuration
const client = generateClient<Schema>();

// Test the client connection
const testConnection = async () => {
  try {
    // Attempt a simple query to test the connection
    const test = await client.models.Restaurant.list({});
    console.log('API connection test successful');
    return true;
  } catch (error) {
    console.error('API connection test failed:', error);
    throw error;
  }
};

export const handler: Handler = async (event, context) => {
  try {
    console.log('Starting seed process for develop environment');
    
    // Test connection before proceeding
    await testConnection();
    
    // Get environment variables
    const userPoolId = process.env.USER_POOL_ID;
    
    if (!userPoolId) {
      throw new Error('Missing required environment variable: USER_POOL_ID must be set');
    }
    
    console.log('Environment variables:', {
      userPoolId,
      apiKey: '***' // Don't log the actual key
    });
    
    // Define owner email for reference
    const ownerEmail = "justin@thevessale.com";
    const password = "Test123!"; // Temporary test password
    
    // Step 1: Create the restaurant
    console.log("Creating restaurant...");
    const restaurantData = {
      name: "World Famous Grill",
      slug: "world-famous-grill",
      description: "A cozy Mediterranean and Greek restaurant serving delicious authentic dishes with modern flair",
      imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5",
      address: "4143 E Florence Ave",
      city: "Bell",
      state: "CA",
      zip: "90201",
      phone: "323-562-0744",
      ownerEmail: ownerEmail,
      isActive: true,
      printerConfig: {
        printerType: "EPSON",
        ipAddress: "192.168.1.100",
        port: 9100,
        isEnabled: true
      }
    };
    
    const restaurantResponse = await client.models.Restaurant.create(restaurantData);
    
    if (!restaurantResponse.data?.id) {
      throw new Error("Restaurant ID is missing from the response.");
    }
    const restaurantId = restaurantResponse.data.id;
    console.log("✅ Restaurant created with ID:", restaurantId);

    // Step 2: Create staff members
    await Promise.all([
      client.models.RestaurantStaff.create({
        email: "manager@worldfamousgrill.com",
        restaurantId: restaurantId,
        role: "MANAGER",
        firstName: "Jane",
        lastName: "Doe",
        isActive: true
      }),
      client.models.RestaurantStaff.create({
        email: "staff@worldfamousgrill.com",
        restaurantId: restaurantId,
        role: "STAFF",
        firstName: "Bob",
        lastName: "Wilson",
        isActive: true
      }),
      // Also create a staff record for the owner for authentication
      client.models.RestaurantStaff.create({
        email: ownerEmail,
        restaurantId: restaurantId,
        role: "OWNER",
        firstName: "John",
        lastName: "Smith",
        isActive: true
      })
    ]);
    console.log("✅ Staff members created");

    // Step 3: Create Menu Categories
    const categories = await Promise.all([
      client.models.MenuCategory.create({
        name: "Appetizers",
        description: "Delicious starters and small plates",
        restaurantId: restaurantId,
      }),
      client.models.MenuCategory.create({
        name: "Main Courses",
        description: "Hearty Mediterranean and Greek entrees",
        restaurantId: restaurantId,
      }),
      client.models.MenuCategory.create({
        name: "Sides",
        description: "Perfect accompaniments to your meal",
        restaurantId: restaurantId,
      }),
    ]);
    console.log("✅ Menu categories created");

    // Step 4: Create Menu Items for each category
    const [appetizers, mains, sides] = categories;

    if (!appetizers.data?.id || !mains.data?.id || !sides.data?.id) {
      throw new Error("One or more category IDs are missing from the response.");
    }

    const appetizersId = appetizers.data.id;
    const mainsId = mains.data.id;
    const sidesId = sides.data.id;

    // Create menu items
    await Promise.all([
      // Appetizers
      client.models.MenuItem.create({
        name: "Monster Nachos",
        description: "Homemade tortilla chips topped with asada beef, cheese, guacamole, sour cream, pico de gallo & jalapenos",
        price: 16.99,
        imageUrl: "https://images.unsplash.com/photo-1513456852971-30c0b8199d4d",
        categoryId: appetizersId,
      }),
      client.models.MenuItem.create({
        name: "Hummus",
        description: "Creamy house-made hummus served with warm pita bread",
        price: 7.99,
        imageUrl: "https://images.unsplash.com/photo-1577805947697-89e18249d767",
        categoryId: appetizersId,
      }),
      client.models.MenuItem.create({
        name: "Grape Leaves",
        description: "Traditional dolmas stuffed with seasoned rice and herbs",
        price: 7.99,
        imageUrl: "https://images.unsplash.com/photo-1541518763669-27fef04b14ea",
        categoryId: appetizersId,
      }),
      
      // Main Courses
      client.models.MenuItem.create({
        name: "Chicken Roll",
        description: "Tender chicken wrapped in fresh flatbread with garlic sauce",
        price: 10.99,
        imageUrl: "https://images.unsplash.com/photo-1603360946369-dc9bb6258143",
        categoryId: mainsId,
      }),
      client.models.MenuItem.create({
        name: "Chicken Wings",
        description: "Crispy wings tossed in your choice of sauce",
        price: 13.99,
        imageUrl: "https://images.unsplash.com/photo-1608039829572-78524f79c4c7",
        categoryId: mainsId,
      }),
      client.models.MenuItem.create({
        name: "Mixed Grill Platter",
        description: "A generous assortment of grilled meats including lamb, chicken, and beef with Mediterranean seasonings",
        price: 28.99,
        imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947",
        categoryId: mainsId,
      }),
      
      // Sides
      client.models.MenuItem.create({
        name: "Garlic Potato",
        description: "Roasted potatoes seasoned with garlic and herbs",
        price: 9.99,
        imageUrl: "https://images.unsplash.com/photo-1568569350062-ebfa3cb195df",
        categoryId: sidesId,
      }),
      client.models.MenuItem.create({
        name: "Onion Rings Tower",
        description: "Crispy battered onion rings stacked high",
        price: 8.99,
        imageUrl: "https://images.unsplash.com/photo-1639024471283-03518883512d",
        categoryId: sidesId,
      }),
    ]);
    console.log("✅ Menu items created");

    // Step 5: Create and verify Cognito user
    console.log(`Creating user ${ownerEmail} in pool ${userPoolId}...`);
    
    // Create Cognito client
    const cognitoClient = new CognitoIdentityProviderClient({ 
      region: region
    });
    
    // Create the user
    const createUserCommand = new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: ownerEmail,
      TemporaryPassword: 'Temp123!', // Initial temp password
      MessageAction: 'SUPPRESS', // Don't send welcome email
      UserAttributes: [
        {
          Name: 'email',
          Value: ownerEmail
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
    
    // Set a permanent password
    const setPasswordCommand = new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: ownerEmail,
      Password: password,
      Permanent: true // This makes it a permanent password
    });
    
    await cognitoClient.send(setPasswordCommand);
    console.log('Password set successfully');
    
    // Return success response
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Develop environment seeded successfully',
        data: {
          restaurantId,
          ownerEmail,
          password
        }
      })
    };
  } catch (error) {
    console.error('Error seeding develop environment:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: 'Error seeding develop environment',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
    };
  }
}; 