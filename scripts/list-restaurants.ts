/**
 * Restaurant Listing Script
 * -------------------------
 * 
 * This script lists all restaurants in the database, showing their IDs, names, and active status.
 * It also automatically identifies and displays any duplicate restaurants (restaurants with the same name).
 * 
 * Use this script when:
 * - You need to identify restaurant IDs for other operations
 * - You suspect there might be duplicate restaurants in the database
 * - You want to verify restaurant data before making changes
 * 
 * Usage:
 * npx tsx scripts/list-restaurants.ts
 * 
 * Output:
 * - A table of all restaurants with their IDs, names, slugs, and active status
 * - A separate table showing any duplicate restaurants grouped by name
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
 * Run this script to list all restaurants
 * Execute from the project root with:
 * npx tsx scripts/list-restaurants.ts
 */
async function listRestaurants() {
  try {
    console.log("Fetching all restaurants...");
    
    const { data: restaurants, errors } = await client.models.Restaurant.list({
      selectionSet: ['id', 'name', 'slug', 'isActive']
    });

    const { data: locations, errors: locationErrors } = await client.models.RestaurantLocation.list({
      selectionSet: ['id', 'name', 'slug', 'isActive']
    });

    if (errors) {
      throw new Error(`Error fetching restaurants: ${JSON.stringify(errors)}`);
    }
    
    if (!restaurants || restaurants.length === 0) {
      console.log("No restaurants found in the database");
      return;
    }
    
    console.log("\n=== Restaurants ===");
    console.log("Count:", restaurants.length);
    console.log("First 5 restaurants:");
    restaurants.slice(0, 5).forEach(r => {
      console.log(`- ${r.name} (${r.id})`);
    });
    console.log("-------------------");

    console.log("\n=== Locations ===");
    console.log("Count:", locations.length);
    console.log("First 5 locations:");
    locations.slice(0, 5).forEach(l => {
      console.log(`- ${l.name} (${l.id})`);
    });
    console.log("-------------------");
    
    // Display restaurants in a table format
    console.table(restaurants.map(r => ({
      ID: r.id,
      Name: r.name,
      Slug: r.slug,
      Active: r.isActive
    })));
    
    // Find duplicates by name
    const nameGroups = restaurants.reduce((acc, restaurant) => {
      const name = restaurant.name || '';
      if (!acc[name]) {
        acc[name] = [];
      }
      acc[name].push(restaurant);
      return acc;
    }, {} as Record<string, typeof restaurants>);
    
    const duplicates = Object.entries(nameGroups)
      .filter(([_, group]) => group.length > 1);
    
    if (duplicates.length > 0) {
      console.log("\n=== Duplicate Restaurants ===");
      duplicates.forEach(([name, group]) => {
        console.log(`\nDuplicate name: "${name}"`);
        console.table(group.map(r => ({
          ID: r.id,
          Slug: r.slug,
          Active: r.isActive
        })));
      });
    } else {
      console.log("\nNo duplicate restaurant names found.");
    }
    
  } catch (error) {
    console.error("❌ Error listing restaurants:", error);
  }
}

// Run the function
listRestaurants(); 