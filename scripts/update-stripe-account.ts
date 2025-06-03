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
    
    console.log(`🔍 Updating restaurant ${restaurantId} with Stripe account ID: ${stripeAccountId}`);
    
    // Update the restaurant
    const { data: restaurant, errors } = await client.models.Restaurant.update({
      id: restaurantId,
      stripeAccountId: stripeAccountId,
      stripeAccountStatus: 'ACTIVE'
    });
    
    if (errors) {
      throw new Error(`Error updating restaurant: ${JSON.stringify(errors)}`);
    }
    
    console.log("✅ Restaurant updated successfully with Stripe account ID");
    console.log("Updated restaurant:", restaurant);
    
  } catch (error) {
    console.error("❌ Error updating restaurant:", error);
  }
}

// Run the function
updateStripeAccount(); 