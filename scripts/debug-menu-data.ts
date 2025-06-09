import { generateClient } from "aws-amplify/api";
import { type Schema } from "../amplify/data/resource";
import outputs from "../amplify_outputs_dev_6.5.2025.json";
import { Amplify } from "aws-amplify";
import * as readline from "readline";

// Configure Amplify
Amplify.configure(outputs);

// Use API key for all operations during debugging
const client = generateClient<Schema>({
  authMode: 'apiKey'
});

/**
 * Create a readline interface for user input
 */
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Prompt user for input
 */
function askQuestion(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Debug menu data for a restaurant
 */
async function debugMenuData() {
  const rl = createReadlineInterface();
  
  try {
    console.log("🔍 Menu Data Debug Tool");
    console.log("========================\n");

    // Get restaurant ID from user
    const restaurantId = await askQuestion(rl, "Enter the Restaurant ID: ");
    
    if (!restaurantId) {
      throw new Error("Restaurant ID is required");
    }

    console.log(`\n🔍 Debugging menu data for restaurant: ${restaurantId}`);
    
    // First, verify the restaurant exists
    const { data: restaurant, errors: restaurantErrors } = await client.models.Restaurant.get({
      id: restaurantId
    });
    
    if (restaurantErrors || !restaurant) {
      throw new Error(`Restaurant not found: ${restaurantId}`);
    }
    
    console.log(`✅ Restaurant found: ${restaurant.name}`);
    
    // Fetch all menu categories for this restaurant
    console.log("\n📂 Fetching menu categories...");
    const { data: categories, errors: categoryErrors } = await client.models.MenuCategory.list({
      filter: { restaurantId: { eq: restaurantId } },
      selectionSet: ['id', 'name', 'description', 'restaurantId', 'locationId']
    });
    
    if (categoryErrors) {
      console.error("❌ Error fetching categories:", categoryErrors);
      return;
    }
    
    console.log(`✅ Found ${categories?.length || 0} categories`);
    
    if (!categories || categories.length === 0) {
      console.log("No categories found for this restaurant.");
      return;
    }
    
    // Display category details
    console.log("\n📋 Category Details:");
    console.log("===================");
    categories.forEach(category => {
      console.log(`- ${category.name} (ID: ${category.id})`);
      console.log(`  Description: ${category.description}`);
      console.log(`  Restaurant ID: ${category.restaurantId}`);
      console.log(`  Location ID: ${category.locationId || 'null'}`);
    });
    
    // For each category, fetch menu items using relational query
    console.log("\n🍽️  Fetching menu items for each category...");
    
    let totalItemsFound = 0;
    
    for (const category of categories) {
      console.log(`\n--- ${category.name} ---`);
      
      // Use relational query approach that works correctly
      const { data: categoryWithItems, errors: menuItemErrors } = await client.models.MenuCategory.get(
        { id: category.id },
        {
          selectionSet: ['id', 'name', 'description', 'menuItems.*']
        }
      );
      
      if (menuItemErrors) {
        console.error(`❌ Error fetching menu items for ${category.name}:`, menuItemErrors);
        continue;
      }
      
      const menuItems = categoryWithItems?.menuItems || [];
      console.log(`Found ${menuItems.length} menu items:`);
      totalItemsFound += menuItems.length;
      
      if (menuItems.length > 0) {
        menuItems.forEach(item => {
          console.log(`  • ${item.name} - $${item.price}`);
          console.log(`    ${item.description}`);
          console.log(`    Category ID: ${item.categoryId}`);
          console.log(`    Image: ${item.imageUrl || 'No image'}`);
        });
      } else {
        console.log("  No menu items found");
      }
    }
    
    // Summary
    console.log("\n📊 Summary:");
    console.log("============");
    console.log(`Restaurant: ${restaurant.name}`);
    console.log(`Categories: ${categories.length}`);
    console.log(`Total Menu Items: ${totalItemsFound}`);

  } catch (error) {
    console.error("❌ Debug failed:", error instanceof Error ? error.message : String(error));
  } finally {
    rl.close();
  }
}

// Run the debug function
debugMenuData(); 