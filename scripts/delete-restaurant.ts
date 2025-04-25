/**
 * Restaurant Deletion Script
 * -------------------------
 * 
 * This script deletes a single restaurant by its ID. Use with caution as this operation cannot be undone.
 * The script verifies the restaurant exists before attempting to delete it and provides confirmation
 * of the restaurant name to help prevent accidental deletions.
 * 
 * IMPORTANT: Before deleting a restaurant, make sure to:
 * 1. Back up any important data
 * 2. Reassign any orders to another restaurant if needed (use fix-order-restaurant-ids.ts)
 * 3. Save the staff member information if you need to recreate them
 * 
 * Use this script when:
 * - You need to remove duplicate restaurants
 * - You're cleaning up test data
 * - You want to completely remove a restaurant from the system
 * 
 * Usage:
 * npx tsx scripts/delete-restaurant.ts RESTAURANT_ID
 * 
 * Where:
 * - RESTAURANT_ID is the unique identifier of the restaurant to delete
 * 
 * Output:
 * - Information about the restaurant being deleted
 * - Confirmation of successful deletion
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
 * Run this script to delete a restaurant by ID
 * Execute from the project root with:
 * npx tsx scripts/delete-restaurant.ts RESTAURANT_ID
 */
async function deleteRestaurant() {
  try {
    const restaurantId = process.argv[2];
    
    if (!restaurantId) {
      console.error("❌ Error: Restaurant ID must be provided as an argument");
      console.log("Usage: npx tsx scripts/delete-restaurant.ts RESTAURANT_ID");
      process.exit(1);
    }
    
    console.log(`🔍 Checking restaurant with ID: ${restaurantId}`);
    
    // First, verify the restaurant exists
    const { data: restaurant, errors } = await client.models.Restaurant.get({
      id: restaurantId
    });
    
    if (errors) {
      throw new Error(`Error checking restaurant: ${JSON.stringify(errors)}`);
    }
    
    if (!restaurant) {
      throw new Error(`Restaurant with ID ${restaurantId} not found`);
    }
    
    console.log(`Found restaurant: ${restaurant.name}`);
    
    // Delete the restaurant
    console.log(`Deleting restaurant: ${restaurant.name}`);
    await client.models.Restaurant.delete({
      id: restaurantId
    });
    
    console.log("✅ Restaurant deleted successfully");
    
  } catch (error) {
    console.error("❌ Error deleting restaurant:", error);
  }
}

// Run the function
deleteRestaurant(); 