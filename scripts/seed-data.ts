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
      name: "The Tasty Corner",
      slug: "the-tasty-corner",
      description: "A cozy restaurant serving delicious comfort food with a modern twist",
      imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4",
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
        name: "Starters",
        description: "Light bites to start your meal",
        restaurantId: restaurantId,
      }),
      client.models.MenuCategory.create({
        name: "Main Courses",
        description: "Hearty main dishes",
        restaurantId: restaurantId,
      }),
      client.models.MenuCategory.create({
        name: "Desserts",
        description: "Sweet treats to finish",
        restaurantId: restaurantId,
      }),
    ]);

    // Create Menu Items for each category
    const [starters, mains, desserts] = categories;

    if (!starters.data?.id || !mains.data?.id || !desserts.data?.id) {
      throw new Error("One or more category IDs are missing from the response.");
    }

    const startersId = starters.data.id;
    const mainsId = mains.data.id;
    const dessertsId = desserts.data.id;

    // Starters
    await Promise.all([
      client.models.MenuItem.create({
        name: "Crispy Calamari",
        description: "Lightly battered calamari served with garlic aioli",
        price: 12.99,
        imageUrl: "https://images.unsplash.com/photo-1604909052743-94e838986d24",
        categoryId: startersId,
      }),
      client.models.MenuItem.create({
        name: "Caesar Salad",
        description: "Fresh romaine lettuce, parmesan, croutons, and house-made dressing",
        price: 10.99,
        imageUrl: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9",
        categoryId: startersId,
      }),
    ]);

    // Main Courses
    await Promise.all([
      client.models.MenuItem.create({
        name: "Grilled Salmon",
        description: "Fresh Atlantic salmon with seasonal vegetables",
        price: 24.99,
        imageUrl: "https://images.unsplash.com/photo-1467003909585-2f8a72700288",
        categoryId: mainsId,
      }),
      client.models.MenuItem.create({
        name: "Ribeye Steak",
        description: "12oz ribeye with garlic mashed potatoes",
        price: 32.99,
        imageUrl: "https://images.unsplash.com/photo-1600891964092-4316c288032e",
        categoryId: mainsId,
      }),
      client.models.MenuItem.create({
        name: "Mushroom Risotto",
        description: "Creamy arborio rice with wild mushrooms and parmesan",
        price: 18.99,
        imageUrl: "https://images.unsplash.com/photo-1476124369491-e7addf5db371",
        categoryId: mainsId,
      }),
    ]);

    // Desserts
    await Promise.all([
      client.models.MenuItem.create({
        name: "Chocolate Lava Cake",
        description: "Warm chocolate cake with a molten center",
        price: 8.99,
        imageUrl: "https://images.unsplash.com/photo-1511911063855-2bf39afa5b2e",
        categoryId: dessertsId,
      }),
      client.models.MenuItem.create({
        name: "New York Cheesecake",
        description: "Classic cheesecake with berry compote",
        price: 7.99,
        imageUrl: "https://images.unsplash.com/photo-1524351199678-941a58a3df50",
        categoryId: dessertsId,
      }),
    ]);

    console.log("✅ Seed data created successfully");
  } catch (error) {
    console.error("❌ Error creating seed data:", error);
  }

}

// Run the seed function
seedData(); 