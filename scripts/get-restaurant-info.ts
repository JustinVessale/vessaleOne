#!/usr/bin/env node

import { generateClient } from 'aws-amplify/api';
import { type Schema } from '../amplify/data/resource';
import { Amplify } from 'aws-amplify';
import config from '../amplify_outputs_prod.6.17.2025.json';
import * as readline from 'readline';

// Configure Amplify
Amplify.configure(config);

// Use API key for all operations
const client = generateClient<Schema>({
  authMode: 'apiKey'
});

/**
 * Create readline interface for user input
 */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Promisify readline question
 */
const askQuestion = (question: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
};

/**
 * Get restaurant information by slug
 */
async function getRestaurantInfo() {
  try {
    console.log('🔍 Restaurant Information Lookup');
    console.log('================================\n');
    
    const slug = await askQuestion('Enter restaurant slug: ');
    
    if (!slug) {
      console.log('❌ Please provide a restaurant slug');
      rl.close();
      return;
    }

    console.log(`\n🔄 Fetching information for restaurant: "${slug}"\n`);

    // Fetch restaurant by slug with locations
    const { data: restaurants, errors } = await client.models.Restaurant.list({
      filter: { slug: { eq: slug } },
      selectionSet: [
        'id', 
        'name', 
        'slug', 
        'description', 
        'bannerImageUrl',
        'address',
        'city',
        'state',
        'zip',
        'phone',
        'ownerEmail',
        'isActive',
        'isChain',
        'stripeAccountId',
        'stripeAccountStatus',
        'createdAt',
        'updatedAt',
        'locations.*'
      ]
    });

    if (errors) {
      console.error('❌ Error fetching restaurant:', JSON.stringify(errors, null, 2));
      rl.close();
      return;
    }

    if (!restaurants || restaurants.length === 0) {
      console.log(`❌ No restaurant found with slug: "${slug}"`);
      rl.close();
      return;
    }

    const restaurant = restaurants[0];
    console.log('✅ Restaurant Found!\n');
    
    // Display restaurant information
    console.log('📋 RESTAURANT DETAILS');
    console.log('=====================');
    console.log(`Name: ${restaurant.name || 'N/A'}`);
    console.log(`Slug: ${restaurant.slug || 'N/A'}`);
    console.log(`ID: ${restaurant.id}`);
    console.log(`Description: ${restaurant.description || 'N/A'}`);
    console.log(`Type: ${restaurant.isChain ? 'Chain Restaurant' : 'Single Location'}`);
    console.log(`Status: ${restaurant.isActive ? '🟢 Active' : '🔴 Inactive'}`);
    console.log(`Created: ${restaurant.createdAt ? new Date(restaurant.createdAt).toLocaleDateString() : 'N/A'}`);
    
    // Contact Information
    console.log('\n📞 CONTACT INFORMATION');
    console.log('======================');
    console.log(`Phone: ${restaurant.phone || 'N/A'}`);
    console.log(`Owner Email: ${restaurant.ownerEmail || 'N/A'}`);
    
    // Address (if available)
    if (restaurant.address || restaurant.city || restaurant.state || restaurant.zip) {
      console.log('\n📍 MAIN ADDRESS');
      console.log('===============');
      console.log(`Street: ${restaurant.address || 'N/A'}`);
      console.log(`City: ${restaurant.city || 'N/A'}`);
      console.log(`State: ${restaurant.state || 'N/A'}`);
      console.log(`ZIP: ${restaurant.zip || 'N/A'}`);
    }

    // Payment Information
    console.log('\n💳 PAYMENT SETUP');
    console.log('================');
    console.log(`Stripe Account ID: ${restaurant.stripeAccountId || 'Not configured'}`);
    console.log(`Stripe Status: ${restaurant.stripeAccountStatus || 'Not configured'}`);

    // Media
    console.log('\n🖼️  MEDIA');
    console.log('=========');
    console.log(`Banner Image: ${restaurant.bannerImageUrl || 'No banner image'}`);

    // Locations
    const locations = restaurant.locations || [];
    console.log(`\n📍 LOCATIONS (${locations.length})`);
    console.log('=================');
    
    if (locations.length === 0) {
      console.log('No locations found');
    } else {
      locations.forEach((location: any, index: number) => {
        console.log(`\n${index + 1}. ${location.name || 'Unnamed Location'}`);
        console.log(`   Slug: ${location.slug || 'N/A'}`);
        console.log(`   ID: ${location.id}`);
        console.log(`   Description: ${location.description || 'N/A'}`);
        console.log(`   Address: ${location.address || 'N/A'}`);
        console.log(`   City: ${location.city || 'N/A'}, ${location.state || 'N/A'} ${location.zip || ''}`);
        console.log(`   Phone: ${location.phoneNumber || 'N/A'}`);
        console.log(`   Status: ${location.isActive ? '🟢 Active' : '🔴 Inactive'}`);
        console.log(`   Banner: ${location.bannerImageUrl || 'No banner'}`);
        
        if (location.printerConfig) {
          console.log(`   Printer: ${location.printerConfig.printerType || 'Not configured'} ${location.printerConfig.isEnabled ? '(Enabled)' : '(Disabled)'}`);
        }
      });
    }

    console.log('\n✅ Done!\n');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  } finally {
    rl.close();
  }
}

// Handle script execution - ES module way
if (import.meta.url === `file://${process.argv[1]}`) {
  getRestaurantInfo().catch(console.error);
}

export { getRestaurantInfo }; 