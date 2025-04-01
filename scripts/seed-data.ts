import { generateClient } from "aws-amplify/api";
import { type Schema } from "../amplify/data/resource";
import outputs from "../amplify_outputs.json";
import { Amplify } from "aws-amplify";

// Configure Amplify
Amplify.configure(outputs);

// Use API key for all operations during seeding
const client = generateClient<Schema>({
  authMode: 'apiKey'
});

/**
 * Run this script to seed the database with initial data for a restaurant.
 * This will create:
 * - A restaurant record
 * - Staff members (including the owner with email justin@thevessale.com)
 * - Menu categories and items
 * 
 * Execute from the project root with:
 * npx tsx scripts/seed-data.ts
 */
async function seedData() {
  try {
    // Define owner email for reference
    const ownerEmail = "justin@thevessale.com";
    
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

    // Create staff members
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

    // Create Menu Categories
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

    // Create Menu Items for each category
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

    console.log("✅ Seed data created successfully");
    console.log("NOTE: Remember to manually create an Auth user for the owner email if needed");
    console.log(`Owner email: ${ownerEmail}`);
  } catch (error) {
    console.error("❌ Error creating seed data:", error);
    console.error("Error details:", error instanceof Error ? error.stack : String(error));
    
    // Check if the error is related to the API
    if (error.errors) {
      console.error("API Errors:", JSON.stringify(error.errors, null, 2));
    }
  }
}

// Run the seed function
seedData(); 