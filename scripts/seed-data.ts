import { generateClient } from "aws-amplify/api";
import { type Schema } from "../amplify/data/resource";
import outputs from "../amplify_outputs.json";
import { Amplify } from "aws-amplify";

Amplify.configure(outputs);

const client = generateClient<Schema>();

async function seedData() {
  try {
    // Create Restaurant
    const restaurantResponse = await client.models.Restaurant.create({
      name: "World Famous Grill",
      slug: "world-famous-grill",
      description: "A cozy Mediterranean and Greek restaurant serving delicious authentic dishes with modern flair",
      imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5",
    });

    if (restaurantResponse.data?.id) {
      var restaurantId = restaurantResponse.data.id; 
    } else {
      // Handle the case where id is missing
      throw new Error("Restaurant ID is missing from the response.");
    }
    
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

    // Create Menu Items for each category
    const [appetizers, mains, sides] = categories;

    if (!appetizers.data?.id || !mains.data?.id || !sides.data?.id) {
      throw new Error("One or more category IDs are missing from the response.");
    }

    const appetizersId = appetizers.data.id;
    const mainsId = mains.data.id;
    const sidesId = sides.data.id;

    // Appetizers
    await Promise.all([
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
        imageUrl: "https://images.unsplash.com/photo-1628438273202-a26b710c5710",
        categoryId: appetizersId,
      }),
    ]);

    // Main Courses
    await Promise.all([
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
      client.models.MenuItem.create({
        name: "Falafel Plate",
        description: "Crispy falafel served with hummus, tahini sauce, and fresh pita bread",
        price: 15.99,
        imageUrl: "https://images.unsplash.com/photo-1593001874117-c99c800e3eb7",
        categoryId: mainsId,
      }),
      client.models.MenuItem.create({
        name: "Gyro Plate",
        description: "Traditional gyro meat served with tzatziki sauce, Greek salad, and pita bread",
        price: 17.99,
        imageUrl: "https://images.unsplash.com/photo-1529059997568-3d847b1154f0",
        categoryId: mainsId,
      }),
    ]);

    // Sides
    await Promise.all([
      client.models.MenuItem.create({
        name: "Garlic Potato",
        description: "Roasted potatoes seasoned with garlic and herbs",
        price: 9.99,
        imageUrl: "https://images.unsplash.com/photo-1585148859783-94a66ee1093f",
        categoryId: sidesId,
      }),
      client.models.MenuItem.create({
        name: "Onion Rings Tower",
        description: "Crispy battered onion rings stacked high",
        price: 8.99,
        imageUrl: "https://images.unsplash.com/photo-1639024471283-03518883512d",
        categoryId: sidesId,
      }),
      client.models.MenuItem.create({
        name: "Cheese Sticks",
        description: "Golden-fried mozzarella sticks with marinara sauce",
        price: 9.49,
        imageUrl: "https://images.unsplash.com/photo-1531749668029-2db88e4276c7",
        categoryId: sidesId,
      }),
    ]);

    console.log("✅ Seed data created successfully");
  } catch (error) {
    console.error("❌ Error creating seed data:", error);
  }

}

// Run the seed function
seedData(); 