import { generateClient } from "aws-amplify/api";
import { type Schema } from "../amplify/data/resource";
import outputs from "../amplify_outputs.json";
import { Amplify } from "aws-amplify";

// Configure Amplify
Amplify.configure(outputs);

// Use API key for all operations
const client = generateClient<Schema>({
  authMode: 'apiKey'
});

/**
 * Run this script to update a restaurant's Stripe account ID
 * Execute from the project root with:
 * npx tsx scripts/update-stripe-account.ts RESTAURANT_ID STRIPE_ACCOUNT_ID
 */
async function updateStripeAccount() {
  try {
    const restaurantId = process.argv[2];
    const stripeAccountId = process.argv[3];
    
    if (!restaurantId || !stripeAccountId) {
      console.error("❌ Error: Both Restaurant ID and Stripe Account ID must be provided as arguments");
      console.log("Usage: npx tsx scripts/update-stripe-account.ts RESTAURANT_ID STRIPE_ACCOUNT_ID");
      process.exit(1);
    }
    
    console.log(`🔍 Checking restaurant ${restaurantId} before update...`);
    
    // First, verify the restaurant exists and get its current data
    const { data: existingRestaurant, errors: getErrors } = await client.models.Restaurant.get({
      id: restaurantId
    });
    
    if (getErrors) {
      throw new Error(`Error fetching restaurant: ${JSON.stringify(getErrors)}`);
    }
    
    if (!existingRestaurant) {
      throw new Error(`Restaurant with ID ${restaurantId} not found`);
    }
    
    console.log(`Found restaurant: ${existingRestaurant.name}`);
    console.log(`Current Stripe Account ID: ${existingRestaurant.stripeAccountId || 'None'}`);
    console.log(`Current Stripe Account Status: ${existingRestaurant.stripeAccountStatus || 'None'}`);
    
    console.log(`🔄 Updating restaurant ${restaurantId} with Stripe account ID: ${stripeAccountId}`);
    
    // Update the restaurant using the existing data plus new Stripe info
    const { data: restaurant, errors } = await client.models.Restaurant.update({
      id: restaurantId,
      stripeAccountId: stripeAccountId,
      stripeAccountStatus: 'ACTIVE'
    });
    
    if (errors) {
      console.error("Update errors:", errors);
      throw new Error(`Error updating restaurant: ${JSON.stringify(errors)}`);
    }
    
    console.log("✅ Restaurant updated successfully with Stripe account ID");
    console.log("Updated restaurant Stripe info:", {
      id: restaurant?.id,
      stripeAccountId: restaurant?.stripeAccountId,
      stripeAccountStatus: restaurant?.stripeAccountStatus
    });
    
  } catch (error) {
    console.error("❌ Error updating restaurant:", error);
  }
}

// Run the function
updateStripeAccount(); 