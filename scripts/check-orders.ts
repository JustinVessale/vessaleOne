/**
 * Order Restaurant ID Check Script
 * -------------------------------
 * 
 * This script analyzes orders in the database to check which restaurant ID they're associated with.
 * It can be used to identify orders that might be linked to the wrong restaurant, especially useful
 * when dealing with duplicate restaurants.
 * 
 * The script can be run in two modes:
 * 1. Without parameters - Lists all orders grouped by restaurant ID
 * 2. With a restaurant ID - Checks which orders don't match the specified "correct" restaurant ID
 * 
 * Use this script when:
 * - You need to audit which orders belong to which restaurants
 * - You're preparing to fix orders linked to the wrong restaurant
 * - You've identified duplicate restaurants and need to see order distribution
 * 
 * Usage:
 * npx tsx scripts/check-orders.ts [CORRECT_RESTAURANT_ID]
 * 
 * Where:
 * - CORRECT_RESTAURANT_ID (optional) is the ID of the restaurant you consider correct
 * 
 * Output:
 * - Orders grouped by restaurant ID
 * - If a correct ID is provided, a summary of orders with correct vs incorrect IDs
 * - Guidance on how to fix incorrectly assigned orders
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
 * Run this script to check if orders are using the correct restaurant ID
 * Execute from the project root with:
 * npx tsx scripts/check-orders.ts [CORRECT_RESTAURANT_ID]
 */
async function checkOrders() {
  try {
    const correctRestaurantId = process.argv[2];
    
    // If no restaurant ID is provided, show all orders grouped by restaurant
    if (!correctRestaurantId) {
      console.log("No specific restaurant ID provided. Showing all orders grouped by restaurant ID.");
    } else {
      console.log(`Checking orders for restaurant ID: ${correctRestaurantId}`);
    }
    
    // Get all restaurants for reference
    const { data: restaurants } = await client.models.Restaurant.list({
      selectionSet: ['id', 'name']
    });
    
    // Create a map of restaurant IDs to names
    const restaurantMap = new Map();
    restaurants.forEach(r => {
      restaurantMap.set(r.id, r.name);
    });
    
    // Fetch all orders with their restaurant IDs
    const { data: orders, errors } = await client.models.Order.list({
      selectionSet: ['id', 'restaurantId', 'status', 'customerName', 'total', 'createdAt']
    });
    
    if (errors) {
      throw new Error(`Error fetching orders: ${JSON.stringify(errors)}`);
    }
    
    if (!orders || orders.length === 0) {
      console.log("No orders found in the database");
      return;
    }
    
    console.log(`\nFound ${orders.length} total orders`);
    
    // Group orders by restaurant ID
    const ordersByRestaurant = orders.reduce((acc, order) => {
      const restaurantId = order.restaurantId || 'unknown';
      if (!acc[restaurantId]) {
        acc[restaurantId] = [];
      }
      acc[restaurantId].push(order);
      return acc;
    }, {} as Record<string, typeof orders>);
    
    // Display orders grouped by restaurant
    console.log("\n=== Orders by Restaurant ===");
    Object.entries(ordersByRestaurant).forEach(([restaurantId, restaurantOrders]) => {
      const restaurantName = restaurantMap.get(restaurantId) || 'Unknown Restaurant';
      console.log(`\nRestaurant: ${restaurantName} (ID: ${restaurantId})`);
      console.log(`Orders: ${restaurantOrders.length}`);
      
      // Show order details in a table
      console.table(restaurantOrders.map(o => ({
        OrderID: o.id,
        Customer: o.customerName || 'Guest',
        Total: o.total,
        Status: o.status,
        Created: new Date(o.createdAt || '').toLocaleString()
      })));
    });
    
    // If a specific restaurant ID was provided, check for orders with wrong restaurant IDs
    if (correctRestaurantId) {
      const correctOrders = ordersByRestaurant[correctRestaurantId] || [];
      const incorrectOrders = orders.filter(o => o.restaurantId !== correctRestaurantId);
      
      console.log(`\n=== Orders Summary ===`);
      console.log(`Orders with correct restaurant ID: ${correctOrders.length}`);
      console.log(`Orders with incorrect restaurant ID: ${incorrectOrders.length}`);
      
      if (incorrectOrders.length > 0) {
        console.log(`\nWould you like to update these ${incorrectOrders.length} orders to use the correct restaurant ID?`);
        console.log(`If yes, run: npx tsx scripts/fix-order-restaurant-ids.ts ${correctRestaurantId}`);
      }
    }
    
  } catch (error) {
    console.error("❌ Error checking orders:", error);
  }
}

// Run the function
checkOrders(); 