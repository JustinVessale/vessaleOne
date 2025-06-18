import { generateClient } from "aws-amplify/api";
import { type Schema } from "../amplify/data/resource";
import outputs from "../amplify_outputs.json";
import { Amplify } from "aws-amplify";
import * as readline from 'readline';

// Configure Amplify
Amplify.configure(outputs);

// Use API key for all operations during update
const client = generateClient<Schema>({
  authMode: 'apiKey'
});

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to prompt user for input
function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// Helper function to validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Script to update the owner email of a specific restaurant.
 * 
 * Execute from the project root with:
 * npx tsx scripts/update-restaurant-owner.ts
 */
async function updateRestaurantOwner() {
  try {
    console.log("👤 Restaurant Owner Update Tool");
    console.log("==============================\n");

    // Get restaurant identifier
    const restaurantIdentifier = await askQuestion("Enter restaurant ID or slug: ");
    if (!restaurantIdentifier) {
      throw new Error("Restaurant identifier is required");
    }

    // Find the restaurant
    console.log(`\n🔍 Looking up restaurant...`);
    let restaurant;
    
    // Try to find by ID first
    try {
      const { data: restaurantById, errors: idErrors } = await client.models.Restaurant.get({
        id: restaurantIdentifier
      });
      
      if (!idErrors && restaurantById) {
        restaurant = restaurantById;
        console.log(`✅ Found restaurant by ID: ${restaurant.name}`);
      }
    } catch (error) {
      console.log("Not found by ID, trying slug...");
    }

    // If not found by ID, try by slug
    if (!restaurant) {
      const { data: restaurants, errors: slugErrors } = await client.models.Restaurant.list({
        filter: {
          slug: { eq: restaurantIdentifier }
        }
      });

      if (slugErrors) {
        throw new Error(`Error searching by slug: ${JSON.stringify(slugErrors)}`);
      }

      if (!restaurants || restaurants.length === 0) {
        throw new Error(`No restaurant found with ID or slug: ${restaurantIdentifier}`);
      }

      if (restaurants.length > 1) {
        throw new Error(`Multiple restaurants found with slug: ${restaurantIdentifier}. Please use the restaurant ID instead.`);
      }

      restaurant = restaurants[0];
      console.log(`✅ Found restaurant by slug: ${restaurant.name}`);
    }

    // Display current restaurant info
    console.log(`\n📋 Current Restaurant Information:`);
    console.log(`Name: ${restaurant.name}`);
    console.log(`Slug: ${restaurant.slug}`);
    console.log(`Current Owner Email: ${restaurant.ownerEmail || 'Not set'}`);
    console.log(`Status: ${restaurant.isActive ? 'Active' : 'Inactive'}`);

    // Get new owner email
    console.log(`\n📧 New Owner Information:`);
    const newOwnerEmail = await askQuestion("Enter new owner email: ");
    if (!newOwnerEmail) {
      throw new Error("New owner email is required");
    }

    if (!isValidEmail(newOwnerEmail)) {
      throw new Error("Invalid email format");
    }

    // Check if the new owner email is different
    if (restaurant.ownerEmail === newOwnerEmail) {
      console.log("❌ New owner email is the same as current owner email. No changes needed.");
      return;
    }

    // Get owner details
    const firstName = await askQuestion("Owner first name: ") || "Restaurant";
    const lastName = await askQuestion("Owner last name: ") || "Owner";

    // Confirm the update
    console.log(`\n📋 Update Summary:`);
    console.log(`Restaurant: ${restaurant.name}`);
    console.log(`Current Owner: ${restaurant.ownerEmail || 'Not set'}`);
    console.log(`New Owner: ${newOwnerEmail} (${firstName} ${lastName})`);
    
    const confirm = await askQuestion("\nProceed with this update? (y/N): ");
    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      console.log("❌ Update cancelled");
      return;
    }

    console.log("\n🔄 Updating restaurant owner...");

    // Step 1: Update the restaurant record
    console.log("1. Updating restaurant record...");
    const { data: updatedRestaurant, errors: restaurantErrors } = await client.models.Restaurant.update({
      id: restaurant.id,
      ownerEmail: newOwnerEmail
    });

    if (restaurantErrors) {
      throw new Error(`Failed to update restaurant: ${JSON.stringify(restaurantErrors)}`);
    }

    console.log("✅ Restaurant record updated");

    // Step 2: Check if there's an existing staff record for the old owner
    if (restaurant.ownerEmail) {
      console.log("2. Checking for existing staff records...");
      
      const { data: existingStaff, errors: staffErrors } = await client.models.RestaurantStaff.list({
        filter: {
          email: { eq: restaurant.ownerEmail },
          restaurantId: { eq: restaurant.id },
          role: { eq: 'OWNER' }
        }
      });

      if (staffErrors) {
        console.warn("⚠️  Warning: Could not check existing staff records:", staffErrors);
      } else if (existingStaff && existingStaff.length > 0) {
        console.log(`Found ${existingStaff.length} existing owner staff record(s)`);
        
        // Update existing staff record to new email
        for (const staff of existingStaff) {
          console.log(`   Updating staff record ${staff.id}...`);
          
          const { errors: updateErrors } = await client.models.RestaurantStaff.update({
            id: staff.id,
            email: newOwnerEmail,
            firstName,
            lastName
          });

          if (updateErrors) {
            console.warn(`⚠️  Warning: Could not update staff record ${staff.id}:`, updateErrors);
          } else {
            console.log(`   ✅ Staff record ${staff.id} updated`);
          }
        }
      } else {
        console.log("No existing owner staff records found");
      }
    }

    // Step 3: Create new staff record for the new owner (if doesn't exist)
    console.log("3. Creating/updating staff record for new owner...");
    
    // Check if staff record already exists for new owner
    const { data: newOwnerStaff, errors: checkErrors } = await client.models.RestaurantStaff.list({
      filter: {
        email: { eq: newOwnerEmail },
        restaurantId: { eq: restaurant.id }
      }
    });

    if (checkErrors) {
      console.warn("⚠️  Warning: Could not check existing staff records for new owner:", checkErrors);
    }

    if (newOwnerStaff && newOwnerStaff.length > 0) {
      // Update existing staff record to OWNER role
      const existingStaff = newOwnerStaff[0];
      console.log(`   Updating existing staff record ${existingStaff.id} to OWNER role...`);
      
      const { errors: updateErrors } = await client.models.RestaurantStaff.update({
        id: existingStaff.id,
        role: 'OWNER',
        firstName,
        lastName
      });

      if (updateErrors) {
        console.warn(`⚠️  Warning: Could not update staff record:`, updateErrors);
      } else {
        console.log(`   ✅ Staff record updated to OWNER role`);
      }
    } else {
      // Create new staff record
      console.log(`   Creating new staff record for ${newOwnerEmail}...`);
      
      const { data: newStaff, errors: createErrors } = await client.models.RestaurantStaff.create({
        email: newOwnerEmail,
        restaurantId: restaurant.id,
        role: 'OWNER',
        firstName,
        lastName,
        isActive: true
      });

      if (createErrors) {
        console.warn(`⚠️  Warning: Could not create staff record:`, createErrors);
      } else {
        console.log(`   ✅ New staff record created`);
      }
    }

    console.log("\n🎉 Restaurant owner update completed successfully!");
    console.log(`\n📋 Final Status:`);
    console.log(`Restaurant: ${restaurant.name}`);
    console.log(`New Owner: ${newOwnerEmail}`);
    console.log(`Owner Role: OWNER`);
    
    console.log(`\n💡 Next steps:`);
    console.log(`1. Create an Auth user for ${newOwnerEmail} if it doesn't exist`);
    console.log(`2. Test the login flow to ensure the new owner can access the restaurant`);
    console.log(`3. Remove the old owner's Auth user if no longer needed`);

  } catch (error) {
    console.error("❌ Error updating restaurant owner:", error);
    console.error("Error details:", error instanceof Error ? error.stack : String(error));
  } finally {
    rl.close();
  }
}

// Run the update function
updateRestaurantOwner(); 