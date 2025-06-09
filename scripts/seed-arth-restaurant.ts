import { generateClient } from "aws-amplify/api";
import { type Schema } from "../amplify/data/resource";
import outputs from "../amplify_outputs_dev_6.5.2025.json";
import { Amplify } from "aws-amplify";

// Configure Amplify
Amplify.configure(outputs);

// Use API key for all operations during seeding
const client = generateClient<Schema>({
  authMode: 'apiKey'
});

/**
 * Run this script to seed the database with Arth restaurant data.
 * This will create:
 * - A restaurant record for Arth
 * - Staff members (including the owner)
 * - Restaurant location
 * 
 * Execute from the project root with:
 * npx tsx scripts/seed-arth-restaurant.ts
 */
async function seedArthRestaurant() {
  try {
    // Define owner email - update this as needed
    const ownerEmail = "info@arthla.com";
    
    console.log("Creating Arth restaurant...");
    const restaurantData = {
      name: "Arth",
      slug: "arth",
      description: "Modern Indian cuisine with traditional flavors and contemporary presentation",
      bannerImageUrl: "https://images.unsplash.com/photo-1565557623262-b51c2513a641", // Indian restaurant placeholder
      address: "9531 Culver Blvd",
      city: "Culver City",
      state: "CA",
      zip: "90232",
      phone: "(424) 603-4155",
      ownerEmail: ownerEmail,
      isActive: true,
      isChain: false,
      printerConfig: {
        printerType: "EPSON",
        ipAddress: "192.168.1.100",
        port: 9100,
        isEnabled: true
      }
    };
    
    console.log("🔍 Restaurant data to create:", JSON.stringify(restaurantData, null, 2));
    
    const restaurantResponse = await client.models.Restaurant.create(restaurantData);
    
    console.log("🔍 Full restaurant response:", JSON.stringify(restaurantResponse, null, 2));
    
    // Check if there are errors in the response
    if (restaurantResponse.errors && restaurantResponse.errors.length > 0) {
      console.error("❌ API Errors:", JSON.stringify(restaurantResponse.errors, null, 2));
      throw new Error(`API returned errors: ${JSON.stringify(restaurantResponse.errors)}`);
    }
    
    if (!restaurantResponse.data?.id) {
      console.error("❌ Restaurant response data:", restaurantResponse.data);
      throw new Error("Restaurant ID is missing from the response.");
    }
    const restaurantId = restaurantResponse.data.id;
    console.log("✅ Arth restaurant created with ID:", restaurantId);

    // Create restaurant location
    console.log("Creating restaurant location...");
    const locationData = {
      name: "Culver City",
      slug: "culver-city",
      description: "Arth location in Culver City",
      bannerImageUrl: restaurantData.bannerImageUrl,
      address: "9531 Culver Blvd",
      city: "Culver City",
      state: "CA",
      zip: "90232",
      phoneNumber: "(424) 603-4155",
      restaurantId: restaurantId,
      isActive: true,
      // Operating hours from the screenshot
      operatingHours: {
        monday: { open: "11:30", close: "22:00", isOpen: true },
        tuesday: { open: "00:00", close: "00:00", isOpen: false }, // Closed
        wednesday: { open: "11:30", close: "22:00", isOpen: true },
        thursday: { open: "11:30", close: "22:00", isOpen: true },
        friday: { open: "11:30", close: "22:00", isOpen: true },
        saturday: { open: "11:30", close: "22:00", isOpen: true },
        sunday: { open: "11:30", close: "22:00", isOpen: true }
      },
      printerConfig: {
        printerType: "EPSON",
        ipAddress: "192.168.1.101",
        port: 9100,
        isEnabled: true
      }
    };

    const locationResponse = await client.models.RestaurantLocation.create(locationData);
    
    if (locationResponse.errors && locationResponse.errors.length > 0) {
      console.error("❌ Location API Errors:", JSON.stringify(locationResponse.errors, null, 2));
    }
    
    console.log("✅ Restaurant location created");

    // Create staff members
    await Promise.all([
      client.models.RestaurantStaff.create({
        email: "manager@arthla.com",
        restaurantId: restaurantId,
        role: "MANAGER",
        firstName: "Restaurant",
        lastName: "Manager",
        isActive: true
      }),
      // Create a staff record for the owner for authentication
      client.models.RestaurantStaff.create({
        email: ownerEmail,
        restaurantId: restaurantId,
        role: "OWNER",
        firstName: "Restaurant",
        lastName: "Owner",
        isActive: true
      })
    ]);
    console.log("✅ Staff members created");

    console.log("\n🎉 Arth restaurant setup completed successfully!");
    console.log("📋 Next steps:");
    console.log(`   1. Restaurant ID: ${restaurantId}`);
    console.log(`   2. Use this ID with the import-menu-csv.ts script to import menu items`);
    console.log(`   3. Owner email: ${ownerEmail}`);
    console.log("   4. Remember to create an Auth user for the owner email if needed");
    
  } catch (error) {
    console.error("❌ Error creating Arth restaurant:", error);
    console.error("Error details:", error instanceof Error ? error.stack : String(error));
    
    // Check if the error is related to the API
    if (error.errors) {
      console.error("API Errors:", JSON.stringify(error.errors, null, 2));
    }
  }
}

// Run the seed function
seedArthRestaurant(); 