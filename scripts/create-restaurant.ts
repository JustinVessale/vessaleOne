import { generateClient } from "aws-amplify/api";
import { type Schema } from "../amplify/data/resource";
import { Amplify } from "aws-amplify";
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Available environment configurations
const ENVIRONMENT_CONFIGS = {
  'default': '../amplify_outputs.json',
  'production': '../amplify_outputs_prod.6.17.2025.json',
  'development': '../amplify_outputs_dev_6.5.2025.json'
};

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Prompt user to select an environment
 */
async function selectEnvironment(): Promise<string> {
  return new Promise((resolve) => {
    console.log('\n🌍 Select environment to run in:');
    Object.keys(ENVIRONMENT_CONFIGS).forEach((env, index) => {
      console.log(`${index + 1}. ${env}`);
    });
    
    rl.question('\nEnter your choice (1-3): ', (answer) => {
      const choice = parseInt(answer);
      const environments = Object.keys(ENVIRONMENT_CONFIGS);
      
      if (choice >= 1 && choice <= environments.length) {
        resolve(environments[choice - 1]);
      } else {
        console.log('Invalid choice. Using default environment.');
        resolve('default');
      }
    });
  });
}

/**
 * Load the selected environment configuration
 */
async function loadEnvironmentConfig(environment: string) {
  const configPath = ENVIRONMENT_CONFIGS[environment as keyof typeof ENVIRONMENT_CONFIGS];
  const fullPath = path.join(__dirname, configPath);
  
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Environment configuration file not found: ${fullPath}`);
  }
  
  console.log(`📁 Loading configuration for ${environment} environment...`);
  
  try {
    // Use dynamic import for ES modules
    const config = await import(configPath);
    return config.default || config;
  } catch (error) {
    throw new Error(`Error loading configuration file: ${error}`);
  }
}

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

// Helper function to validate phone number format
function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

// Helper function to validate ZIP code format
function isValidZip(zip: string): boolean {
  const zipRegex = /^\d{5}(-\d{4})?$/;
  return zipRegex.test(zip);
}

// Helper function to generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Interactive script to create a restaurant record.
 * Prompts user for all required restaurant information.
 * 
 * Execute from the project root with:
 * npx tsx scripts/create-restaurant.ts
 */
async function createRestaurant() {
  try {
    console.log("🍽️  Restaurant Creation Wizard");
    console.log("==============================\n");

    // Select environment
    const selectedEnvironment = await selectEnvironment();
    const outputs = await loadEnvironmentConfig(selectedEnvironment);
    
    // Configure Amplify with selected environment
    Amplify.configure(outputs);
    
    // Use API key for all operations during creation
    const client = generateClient<Schema>({
      authMode: 'apiKey'
    });

    // Get restaurant basic information
    const name = await askQuestion("Restaurant name: ");
    if (!name) {
      throw new Error("Restaurant name is required");
    }

    const description = await askQuestion("Restaurant description: ");
    if (!description) {
      throw new Error("Restaurant description is required");
    }

    const slug = await askQuestion(`Restaurant slug (or press Enter to use "${generateSlug(name)}"): `) || generateSlug(name);

    // Get address information
    console.log("\n📍 Address Information:");
    const address = await askQuestion("Street address: ");
    if (!address) {
      throw new Error("Street address is required");
    }

    const city = await askQuestion("City: ");
    if (!city) {
      throw new Error("City is required");
    }

    const state = await askQuestion("State (2-letter code, e.g., CA): ");
    if (!state || state.length !== 2) {
      throw new Error("State must be a 2-letter code");
    }

    const zip = await askQuestion("ZIP code: ");
    if (!zip || !isValidZip(zip)) {
      throw new Error("Valid ZIP code is required");
    }

    // Get contact information
    console.log("\n📞 Contact Information:");
    const phone = await askQuestion("Phone number: ");
    if (!phone || !isValidPhone(phone)) {
      throw new Error("Valid phone number is required");
    }

    const ownerEmail = await askQuestion("Owner email: ");
    if (!ownerEmail || !isValidEmail(ownerEmail)) {
      throw new Error("Valid owner email is required");
    }

    // Get image URL
    const bannerImageUrl = await askQuestion("Banner image URL (or press Enter to skip): ") || "";

    // Get restaurant type
    console.log("\n🏢 Restaurant Type:");
    const isChainInput = await askQuestion("Is this a chain restaurant? (y/n): ");
    const isChain = isChainInput.toLowerCase() === 'y' || isChainInput.toLowerCase() === 'yes';

    // Get printer configuration
    console.log("\n🖨️  Printer Configuration:");
    const enablePrinter = await askQuestion("Enable printer configuration? (y/n): ");
    let printerConfig: {
      printerType: string;
      ipAddress: string;
      port: number;
      isEnabled: boolean;
    } | undefined = undefined;

    if (enablePrinter.toLowerCase() === 'y' || enablePrinter.toLowerCase() === 'yes') {
      const printerType = await askQuestion("Printer type (e.g., EPSON): ") || "EPSON";
      const ipAddress = await askQuestion("Printer IP address: ");
      const portInput = await askQuestion("Printer port (default 9100): ") || "9100";
      const port = parseInt(portInput, 10);

      if (!ipAddress) {
        throw new Error("Printer IP address is required when printer is enabled");
      }

      printerConfig = {
        printerType,
        ipAddress,
        port,
        isEnabled: true
      };
    }

    // Confirm creation
    console.log("\n📋 Restaurant Summary:");
    console.log(`Environment: ${selectedEnvironment}`);
    console.log(`Name: ${name}`);
    console.log(`Slug: ${slug}`);
    console.log(`Description: ${description}`);
    console.log(`Address: ${address}, ${city}, ${state} ${zip}`);
    console.log(`Phone: ${phone}`);
    console.log(`Owner Email: ${ownerEmail}`);
    console.log(`Chain Restaurant: ${isChain ? 'Yes' : 'No'}`);
    console.log(`Banner Image URL: ${bannerImageUrl || 'None'}`);
    console.log(`Printer Enabled: ${printerConfig ? 'Yes' : 'No'}`);

    const confirm = await askQuestion("\nCreate this restaurant? (y/n): ");
    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      console.log("❌ Restaurant creation cancelled");
      return;
    }

    // Create restaurant data object
    const restaurantData: any = {
      name,
      slug,
      description,
      address,
      city,
      state: state.toUpperCase(),
      zip,
      phone,
      ownerEmail,
      isActive: true,
      isChain,
    };

    // Add optional fields only if they have values
    if (bannerImageUrl) {
      restaurantData.bannerImageUrl = bannerImageUrl;
    }

    if (printerConfig) {
      restaurantData.printerConfig = printerConfig;
    }

    console.log("\n🔄 Creating restaurant...");
    const restaurantResponse = await client.models.Restaurant.create(restaurantData);

    if (!restaurantResponse.data?.id) {
      throw new Error("Restaurant ID is missing from the response.");
    }

    const restaurantId = restaurantResponse.data.id;
    console.log("✅ Restaurant created successfully!");
    console.log(`Restaurant ID: ${restaurantId}`);
    console.log(`Restaurant Slug: ${slug}`);
    console.log(`Owner Email: ${ownerEmail}`);
    console.log("\n💡 Next steps:");
    console.log("1. Create an Auth user for the owner email if needed");
    console.log("2. Add restaurant locations using the Restaurant Portal");
    console.log("3. Add menu categories and items");
    console.log("4. Upload restaurant images through the Restaurant Portal UI");

  } catch (error) {
    console.error("❌ Error creating restaurant:", error);
    console.error("Error details:", error instanceof Error ? error.stack : String(error));
    
    // Check if the error is related to the API
    if (error.errors) {
      console.error("API Errors:", JSON.stringify(error.errors, null, 2));
    }
  } finally {
    rl.close();
  }
}

// Run the creation function
createRestaurant(); 