import { generateClient } from "aws-amplify/api";
import { type Schema } from "../amplify/data/resource";
import outputs from "../amplify_outputs_dev_6.5.2025.json";
import { Amplify } from "aws-amplify";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// Configure Amplify
Amplify.configure(outputs);

// Use API key for all operations during import
const client = generateClient<Schema>({
  authMode: 'apiKey'
});

interface CsvMenuItem {
  name: string;
  description: string;
  price: string;
  category: string;
  imageUrl?: string;
  isActive?: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; item: CsvMenuItem; error: string }>;
}

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
 * Parse CSV content into menu items
 */
function parseCsv(csvContent: string): CsvMenuItem[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  // Helper function to parse a CSV line with proper quote handling
  function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        // Handle escaped quotes (double quotes)
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip the next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add the last field
    result.push(current.trim());
    
    return result;
  }

  // Parse header row
  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase());
  
  // Validate required headers
  const requiredHeaders = ['name', 'description', 'price', 'category'];
  const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
  
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required CSV headers: ${missingHeaders.join(', ')}`);
  }

  // Parse data rows
  const items: CsvMenuItem[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    
    if (values.length < headers.length) {
      console.warn(`⚠️  Row ${i + 1} has fewer columns than expected, skipping...`);
      continue;
    }

    const item: CsvMenuItem = {
      name: '',
      description: '',
      price: '',
      category: ''
    };

    headers.forEach((header, index) => {
      const value = values[index] || '';
      switch (header) {
        case 'name':
          item.name = value;
          break;
        case 'description':
          item.description = value;
          break;
        case 'price':
          item.price = value;
          break;
        case 'category':
          item.category = value;
          break;
        case 'imageurl':
        case 'image_url':
        case 'image url':
          item.imageUrl = value;
          break;
        case 'isactive':
        case 'is_active':
        case 'active':
          item.isActive = value;
          break;
      }
    });

    if (item.name && item.description && item.price && item.category) {
      items.push(item);
    } else {
      console.warn(`⚠️  Row ${i + 1} is missing required fields, skipping...`);
    }
  }

  return items;
}

/**
 * Validate restaurant exists
 */
async function validateRestaurant(restaurantId: string) {
  try {
    const restaurant = await client.models.Restaurant.get({ id: restaurantId });
    if (!restaurant.data) {
      throw new Error(`Restaurant with ID ${restaurantId} not found`);
    }
    return restaurant.data;
  } catch (error) {
    throw new Error(`Failed to validate restaurant: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get or create menu category
 */
async function getOrCreateCategory(categoryName: string, restaurantId: string) {
  try {
    // First try to find existing category
    const existingCategories = await client.models.MenuCategory.list({
      filter: {
        restaurantId: { eq: restaurantId },
        name: { eq: categoryName }
      }
    });

    if (existingCategories.data && existingCategories.data.length > 0) {
      return existingCategories.data[0];
    }

    // Create new category if it doesn't exist
    const newCategory = await client.models.MenuCategory.create({
      name: categoryName,
      description: `${categoryName} items`,
      restaurantId: restaurantId
    });

    if (!newCategory.data) {
      throw new Error(`Failed to create category: ${categoryName}`);
    }

    return newCategory.data;
  } catch (error) {
    throw new Error(`Failed to get or create category "${categoryName}": ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Create a single menu item
 */
async function createMenuItem(item: CsvMenuItem, categoryId: string, rowNumber: number): Promise<void> {
  const price = parseFloat(item.price);
  
  if (isNaN(price) || price < 0) {
    throw new Error(`Invalid price: ${item.price}`);
  }

  const menuItemData = {
    name: item.name,
    description: item.description,
    price: price,
    categoryId: categoryId,
    imageUrl: item.imageUrl || undefined
  };

  const result = await client.models.MenuItem.create(menuItemData);
  
  if (!result.data) {
    throw new Error('Failed to create menu item - no data returned');
  }
}

/**
 * Import menu items from CSV
 */
async function importMenuItems(csvItems: CsvMenuItem[], restaurantId: string): Promise<ImportResult> {
  const result: ImportResult = {
    success: 0,
    failed: 0,
    errors: []
  };

  // Group items by category
  const categoryGroups = new Map<string, CsvMenuItem[]>();
  
  csvItems.forEach((item, index) => {
    if (!categoryGroups.has(item.category)) {
      categoryGroups.set(item.category, []);
    }
    categoryGroups.get(item.category)!.push(item);
  });

  console.log(`📂 Found ${categoryGroups.size} categories to process...`);

  // Process each category
  for (const [categoryName, items] of categoryGroups) {
    console.log(`\n🍽️  Processing category: ${categoryName} (${items.length} items)`);
    
    try {
      const category = await getOrCreateCategory(categoryName, restaurantId);
      
      // Process items in this category
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const rowNumber = csvItems.indexOf(item) + 2; // +2 for 1-indexed and header row
        
        try {
          await createMenuItem(item, category.id, rowNumber);
          result.success++;
          console.log(`  ✅ Created: ${item.name}`);
        } catch (error) {
          result.failed++;
          const errorMessage = error instanceof Error ? error.message : String(error);
          result.errors.push({
            row: rowNumber,
            item: item,
            error: errorMessage
          });
          console.log(`  ❌ Failed: ${item.name} - ${errorMessage}`);
        }
      }
    } catch (error) {
      // If category creation fails, mark all items in this category as failed
      const errorMessage = error instanceof Error ? error.message : String(error);
      items.forEach((item) => {
        const rowNumber = csvItems.indexOf(item) + 2;
        result.failed++;
        result.errors.push({
          row: rowNumber,
          item: item,
          error: `Category error: ${errorMessage}`
        });
      });
      console.log(`  ❌ Category failed: ${categoryName} - ${errorMessage}`);
    }
  }

  return result;
}

/**
 * Main function to run the CSV import
 */
async function runImport() {
  const rl = createReadlineInterface();
  
  try {
    console.log("🍽️  Menu CSV Import Tool");
    console.log("========================\n");

    // Get restaurant ID from user
    const restaurantId = await askQuestion(rl, "Enter the Restaurant ID: ");
    
    if (!restaurantId) {
      throw new Error("Restaurant ID is required");
    }

    console.log(`\n🔍 Validating restaurant ${restaurantId}...`);
    const restaurant = await validateRestaurant(restaurantId);
    console.log(`✅ Restaurant found: ${restaurant.name}`);

    // Get CSV file path from user
    const csvPath = await askQuestion(rl, "\nEnter the path to your CSV file: ");
    
    if (!csvPath) {
      throw new Error("CSV file path is required");
    }

    // Resolve the path relative to the project root
    const fullPath = path.resolve(csvPath);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`CSV file not found: ${fullPath}`);
    }

    console.log(`\n📄 Reading CSV file: ${fullPath}`);
    const csvContent = fs.readFileSync(fullPath, 'utf-8');
    
    console.log("🔍 Parsing CSV content...");
    const csvItems = parseCsv(csvContent);
    console.log(`✅ Found ${csvItems.length} menu items to import`);

    // Confirm before proceeding
    const confirm = await askQuestion(rl, `\nProceed with importing ${csvItems.length} items to "${restaurant.name}"? (y/N): `);
    
    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      console.log("Import cancelled.");
      return;
    }

    console.log("\n🚀 Starting import...");
    const result = await importMenuItems(csvItems, restaurantId);

    // Print results
    console.log("\n📊 Import Results:");
    console.log("==================");
    console.log(`✅ Successfully created: ${result.success} items`);
    console.log(`❌ Failed to create: ${result.failed} items`);

    if (result.errors.length > 0) {
      console.log("\n❌ Errors:");
      result.errors.forEach((error) => {
        console.log(`  Row ${error.row}: ${error.item.name} - ${error.error}`);
      });
    }

    console.log(`\n🎉 Import completed! ${result.success}/${csvItems.length} items imported successfully.`);

  } catch (error) {
    console.error("❌ Import failed:", error instanceof Error ? error.message : String(error));
  } finally {
    rl.close();
  }
}

// Show usage information
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🍽️  Menu CSV Import Tool
========================

This script imports menu items from a CSV file into a restaurant.

Usage:
  npx tsx scripts/import-menu-csv.ts

Required CSV format:
  name,description,price,category[,imageUrl,isActive]

Example CSV:
  name,description,price,category,imageUrl,isActive
  "Chicken Wings","Crispy wings with sauce",12.99,"Appetizers","https://example.com/wings.jpg",true
  "Caesar Salad","Fresh romaine with dressing",8.99,"Salads",,true

Notes:
  - name, description, price, and category are required
  - imageUrl and isActive are optional
  - isActive defaults to true if not specified
  - Script will ask for Restaurant ID interactively
  - Categories will be created automatically if they don't exist
`);
} else {
  // Run the import
  runImport();
} 