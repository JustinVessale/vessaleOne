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

/**
 * Prompt user to select an environment
 */
async function selectEnvironment(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    console.log('\n🌍 Select environment to run in:');
    Object.keys(ENVIRONMENT_CONFIGS).forEach((env, index) => {
      console.log(`${index + 1}. ${env}`);
    });
    
    rl.question('\nEnter your choice (1-3): ', (answer) => {
      rl.close();
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
 * Prompt user for input
 */
async function promptForInput(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
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

/**
 * Run this script to update a restaurant's Stripe account ID
 * Execute from the project root with:
 * npx tsx scripts/update-stripe-account.ts
 */
async function updateStripeAccount() {
  try {
    console.log('🔧 Restaurant Stripe Account Update Tool');
    console.log('=====================================');
    
    // Select environment
    const selectedEnvironment = await selectEnvironment();
    const outputs = await loadEnvironmentConfig(selectedEnvironment);
    
    // Configure Amplify with selected environment
    Amplify.configure(outputs);
    
    // Use API key for all operations
    const client = generateClient<Schema>({
      authMode: 'apiKey'
    });

    // Prompt for restaurant ID
    const restaurantId = await promptForInput('\n🏪 Enter Restaurant ID: ');
    
    if (!restaurantId) {
      console.error("❌ Error: Restaurant ID is required");
      process.exit(1);
    }
    
    // Prompt for Stripe account ID
    const stripeAccountId = await promptForInput('💳 Enter Stripe Account ID: ');
    
    if (!stripeAccountId) {
      console.error("❌ Error: Stripe Account ID is required");
      process.exit(1);
    }
    
    console.log(`\n🔍 Checking restaurant ${restaurantId} before update...`);
    
    // First, verify the restaurant exists and get its current data
    const { data: existingRestaurant, errors: getErrors } = await client.models.Restaurant.get({
      id: restaurantId
    });
    
    if (getErrors) {
      throw new Error(`Error fetching restaurant: ${JSON.stringify(getErrors)}`);
    }
    
    if (!existingRestaurant) {
      throw new Error(`Restaurant with ID ${restaurantId} not found`);
    }
    
    console.log(`✅ Found restaurant: ${existingRestaurant.name}`);
    console.log(`📊 Current Stripe Account ID: ${existingRestaurant.stripeAccountId || 'None'}`);
    console.log(`📊 Current Stripe Account Status: ${existingRestaurant.stripeAccountStatus || 'None'}`);
    
    // Confirm the update
    const confirmUpdate = await promptForInput(`\n⚠️  Are you sure you want to update restaurant "${existingRestaurant.name}" with Stripe account ID "${stripeAccountId}"? (yes/no): `);
    
    if (confirmUpdate.toLowerCase() !== 'yes' && confirmUpdate.toLowerCase() !== 'y') {
      console.log('❌ Update cancelled by user');
      process.exit(0);
    }
    
    console.log(`\n🔄 Updating restaurant ${restaurantId} with Stripe account ID: ${stripeAccountId}`);
    
    // Update the restaurant using the existing data plus new Stripe info
    const { data: restaurant, errors } = await client.models.Restaurant.update({
      id: restaurantId,
      stripeAccountId: stripeAccountId,
      stripeAccountStatus: 'ACTIVE'
    });
    
    if (errors) {
      console.error("Update errors:", errors);
      throw new Error(`Error updating restaurant: ${JSON.stringify(errors)}`);
    }
    
    console.log("\n✅ Restaurant updated successfully with Stripe account ID!");
    console.log("📋 Updated restaurant Stripe info:");
    console.log(`   - Restaurant ID: ${restaurant?.id}`);
    console.log(`   - Restaurant Name: ${restaurant?.name}`);
    console.log(`   - Stripe Account ID: ${restaurant?.stripeAccountId}`);
    console.log(`   - Stripe Account Status: ${restaurant?.stripeAccountStatus}`);
    
  } catch (error) {
    console.error("❌ Error updating restaurant:", error);
  }
}

// Run the function
updateStripeAccount(); 