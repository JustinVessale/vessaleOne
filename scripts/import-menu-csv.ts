import { generateClient } from "aws-amplify/api";
import { type Schema } from "../amplify/data/resource";
import outputs from "../amplify_outputs_prod.6.17.2025.json";
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
 * Clean price string by removing dollar signs, commas, and converting to number
 */
function cleanPrice(priceStr: string): string {
  return priceStr.replace(/[$,]/g, '').trim();
}

/**
 * Generate a default description if none is provided
 */
function generateDefaultDescription(name: string): string {
  return `${name} - Delicious menu item`;
}

/**
 * Detect CSV format and map columns appropriately
 */
function detectCsvFormat(headers: string[]): { nameIndex: number; descriptionIndex: number; priceIndex: number; categoryIndex: number; imageIndex?: number; activeIndex?: number } {
  const headerMap: { [key: string]: number } = {};
  
  headers.forEach((header, index) => {
    const normalizedHeader = header.toLowerCase().trim();
    headerMap[normalizedHeader] = index;
  });

  // Try to find required fields with flexible matching
  const nameIndex = headerMap['name'] ?? headerMap['item'] ?? headerMap['title'] ?? -1;
  const descriptionIndex = headerMap['description'] ?? headerMap['desc'] ?? headerMap['details'] ?? -1;
  const priceIndex = headerMap['price'] ?? headerMap['cost'] ?? headerMap['amount'] ?? -1;
  const categoryIndex = headerMap['category'] ?? headerMap['cat'] ?? headerMap['section'] ?? -1;
  const imageIndex = headerMap['picture'] ?? headerMap['image'] ?? headerMap['imageurl'] ?? headerMap['image_url'] ?? headerMap['image url'] ?? -1;
  const activeIndex = headerMap['isactive'] ?? headerMap['is_active'] ?? headerMap['active'] ?? headerMap['status'] ?? -1;

  // Validate required fields
  if (nameIndex === -1) throw new Error('Could not find "name" column (tried: name, item, title)');
  if (priceIndex === -1) throw new Error('Could not find "price" column (tried: price, cost, amount)');
  if (categoryIndex === -1) throw new Error('Could not find "category" column (tried: category, cat, section)');

  return {
    nameIndex,
    descriptionIndex,
    priceIndex,
    categoryIndex,
    imageIndex: imageIndex !== -1 ? imageIndex : undefined,
    activeIndex: activeIndex !== -1 ? activeIndex : undefined
  };
}

/**
 * Parse CSV content into menu items with improved robustness
 */
function parseCsv(csvContent: string): CsvMenuItem[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  // More robust CSV parsing function
  function parseCSVLine(text: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < text.length) {
      const char = text[i];
      
      if (char === '"') {
        if (inQuotes) {
          // Check if this is an escaped quote (double quote)
          if (i + 1 < text.length && text[i + 1] === '"') {
            current += '"';
            i += 2; // Skip both quotes
            continue;
          } else {
            // End of quoted field
            inQuotes = false;
          }
        } else {
          // Start of quoted field
          inQuotes = true;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator - add current field to result
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
      
      i++;
    }
    
    // Add the last field
    result.push(current.trim());
    
    return result;
  }

  // Parse header row
  const headerLine = lines[0];
  console.log('Header line:', headerLine);
  const headers = parseCSVLine(headerLine);
  console.log('Parsed headers:', headers);
  
  // Detect CSV format
  const format = detectCsvFormat(headers);
  console.log('Detected format:', format);

  // Parse data rows
  const items: CsvMenuItem[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) {
      console.log(`Skipping empty line ${i + 1}`);
      continue;
    }
    
    console.log(`Parsing line ${i + 1}:`, line);
    
    const values = parseCSVLine(line);
    console.log(`Parsed values:`, values);
    
    if (values.length < Math.max(format.nameIndex, format.priceIndex, format.categoryIndex) + 1) {
      console.warn(`⚠️  Row ${i + 1} has fewer columns than expected (${values.length} vs expected), skipping...`);
      continue;
    }

    const name = values[format.nameIndex]?.replace(/^"|"$/g, '') || ''; // Remove surrounding quotes
    const description = values[format.descriptionIndex] || generateDefaultDescription(name);
    const price = cleanPrice(values[format.priceIndex] || '');
    const category = values[format.categoryIndex] || '';
    const imageUrl = format.imageIndex !== undefined ? values[format.imageIndex] : undefined;
    const isActive = format.activeIndex !== undefined ? values[format.activeIndex] : 'true';

    console.log(`Parsed item:`, { name, description, price, category, imageUrl, isActive });

    // Only add items that have required fields and valid price
    if (name && category && price && !isNaN(parseFloat(price))) {
      items.push({
        name,
        description,
        price,
        category,
        imageUrl: imageUrl || undefined,
        isActive
      });
    } else {
      console.warn(`⚠️  Row ${i + 1} is missing required fields or has invalid price:`, {
        name: !!name,
        category: !!category,
        price: !!price,
        validPrice: !isNaN(parseFloat(price))
      });
    }
  }

  console.log(`Final parsed items count: ${items.length}`);
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
  
  csvItems.forEach((item) => {
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
          console.log(`  ✅ Created: ${item.name} - $${item.price}`);
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
    console.log("🍽️  Menu CSV Import Tool (Enhanced)");
    console.log("===================================\n");

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

    // Show categories that will be created
    const categories = [...new Set(csvItems.map(item => item.category))];
    console.log(`\n📂 Categories that will be created:`);
    categories.forEach(cat => console.log(`  - ${cat}`));

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
🍽️  Menu CSV Import Tool (Enhanced)
===================================

This script imports menu items from a CSV file into a restaurant.

Usage:
  npx tsx scripts/import-menu-csv.ts

Supported CSV formats:
  1. Standard: name,description,price,category[,imageUrl,isActive]
  2. Cafe Laurent: Category,Name,Price,Picture,description
  3. Flexible: The script will auto-detect column names

Column name variations supported:
  - name: name, item, title
  - description: description, desc, details
  - price: price, cost, amount
  - category: category, cat, section
  - image: picture, image, imageUrl, image_url, image url
  - active: isActive, is_active, active, status

Example CSV formats:
  1. Standard:
     name,description,price,category,imageUrl,isActive
     "Chicken Wings","Crispy wings with sauce",12.99,"Appetizers","https://example.com/wings.jpg",true

  2. Cafe Laurent style:
     Category,Name,Price,Picture,description
     "Appetizers","Chicken Wings","$12.99","","Crispy wings with sauce"

Features:
  - Auto-detects CSV format
  - Handles dollar signs and commas in prices
  - Skips empty rows
  - Generates default descriptions for missing descriptions
  - Handles quoted text properly
  - Creates categories automatically
  - Provides detailed error reporting

Notes:
  - name, price, and category are required
  - description will be auto-generated if missing
  - imageUrl and isActive are optional
  - Script will ask for Restaurant ID interactively
  - Categories will be created automatically if they don't exist
`);
} else {
  // Run the import
  runImport();
} 