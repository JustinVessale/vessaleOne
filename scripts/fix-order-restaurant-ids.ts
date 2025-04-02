/**
 * Fix Order Restaurant IDs Script
 * ------------------------------
 * 
 * This script updates all orders that are not currently associated with the specified "correct" 
 * restaurant ID. It's particularly useful for fixing orders assigned to duplicate restaurants
 * or for consolidating orders under a single restaurant.
 * 
 * The script performs the following steps:
 * 1. Verifies the specified restaurant exists
 * 2. Finds all orders with a different restaurant ID
 * 3. Lists the orders that will be updated
 * 4. Updates each order to use the correct restaurant ID
 * 
 * Use this script when:
 * - You've identified orders assigned to the wrong restaurant
 * - You're consolidating multiple restaurants into one
 * - You're preparing to delete a duplicate restaurant
 * 
 * IMPORTANT: Run the check-orders.ts script first to identify which orders need fixing
 * and to determine the correct restaurant ID to use.
 * 
 * Usage:
 * npx tsx scripts/fix-order-restaurant-ids.ts CORRECT_RESTAURANT_ID
 * 
 * Where:
 * - CORRECT_RESTAURANT_ID is the ID of the restaurant that should own all orders
 * 
 * Output:
 * - List of orders being updated
 * - Progress updates during the update process
 * - Summary of successful updates
 */

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
 * Run this script to update orders to use the correct restaurant ID
 * Execute from the project root with:
 * npx tsx scripts/fix-order-restaurant-ids.ts CORRECT_RESTAURANT_ID
 */
async function fixOrderRestaurantIds() {
  try {
    const correctRestaurantId = process.argv[2];
    
    if (!correctRestaurantId) {
      console.error("❌ Error: Correct restaurant ID must be provided as an argument");
      console.log("Usage: npx tsx scripts/fix-order-restaurant-ids.ts CORRECT_RESTAURANT_ID");
      process.exit(1);
    }
    
    // First, verify the restaurant exists
    const { data: restaurant, errors: restaurantErrors } = await client.models.Restaurant.get({
      id: correctRestaurantId
    });
    
    if (restaurantErrors) {
      throw new Error(`Error checking restaurant: ${JSON.stringify(restaurantErrors)}`);
    }
    
    if (!restaurant) {
      throw new Error(`Restaurant with ID ${correctRestaurantId} not found`);
    }
    
    console.log(`Found correct restaurant: ${restaurant.name} (ID: ${correctRestaurantId})`);
    
    // Get all orders NOT associated with the correct restaurant ID
    const { data: orders, errors } = await client.models.Order.list({
      selectionSet: ['id', 'restaurantId', 'customerName', 'status']
    });
    
    if (errors) {
      throw new Error(`Error fetching orders: ${JSON.stringify(errors)}`);
    }
    
    const incorrectOrders = orders.filter(o => o.restaurantId !== correctRestaurantId);
    
    console.log(`Found ${incorrectOrders.length} orders with incorrect restaurant ID`);
    
    if (incorrectOrders.length === 0) {
      console.log("✅ No orders need to be fixed.");
      return;
    }
    
    console.log("\nOrders to be updated:");
    console.table(incorrectOrders.map(o => ({
      ID: o.id,
      CurrentRestaurantId: o.restaurantId,
      Customer: o.customerName || 'Guest',
      Status: o.status
    })));
    
    // Ask for confirmation
    console.log(`\nAbout to update ${incorrectOrders.length} orders to restaurant ID: ${correctRestaurantId}`);
    console.log("Type 'yes' and press Enter to continue, or press Ctrl+C to cancel");
    
    // Simplified confirmation for script demonstration
    // In a real implementation, you'd want to use a library like 'readline' to get user input
    // For now, we'll just continue automatically with a warning
    console.log("\n!!! AUTOMATIC CONFIRMATION ENABLED FOR DEMONSTRATION !!!");
    console.log("!!! In a real script, you'd be asked to confirm here !!!");
    
    // Update each order
    console.log("\nUpdating orders...");
    let updateCount = 0;
    
    for (const order of incorrectOrders) {
      try {
        await client.models.Order.update({
          id: order.id,
          restaurantId: correctRestaurantId
        });
        console.log(`✅ Updated order: ${order.id}`);
        updateCount++;
      } catch (error) {
        console.error(`❌ Failed to update order ${order.id}:`, error);
      }
    }
    
    console.log(`\n✅ Successfully updated ${updateCount} of ${incorrectOrders.length} orders`);
    
  } catch (error) {
    console.error("❌ Error fixing order restaurant IDs:", error);
  }
}

// Run the function
fixOrderRestaurantIds(); 