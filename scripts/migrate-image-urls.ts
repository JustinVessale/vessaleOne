import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../amplify/data/resource';
import { getUrl } from 'aws-amplify/storage';
import outputs from "../amplify_outputs.json";
import { Amplify } from "aws-amplify";

// This was a script to migrate image URLs from the old format to the new format. We were using pre-signed urls before and they expire, so now we are using storage keys.
// Configure Amplify
Amplify.configure(outputs);

const client = generateClient<Schema>();

interface MigrationReport {
  totalRecords: number;
  processedRecords: number;
  successfulConversions: number;
  failedConversions: number;
  skippedRecords: number;
  errors: Array<{
    recordId: string;
    table: string;
    error: string;
    originalUrl: string;
  }>;
  changes: Array<{
    recordId: string;
    table: string;
    originalUrl: string;
    newKey: string;
  }>;
}

/**
 * Extracts the storage key from a pre-signed URL or validates an existing storage key
 */
function extractStorageKey(url: string): string | null {
  try {
    // If it's already a storage key (doesn't start with http)
    if (!url.startsWith('http')) {
      return url;
    }

    // Parse the URL to extract the key
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    
    // Remove any query parameters and decode the URL
    const decodedPath = decodeURIComponent(path);
    
    // Remove leading slash if present
    const key = decodedPath.startsWith('/') ? decodedPath.slice(1) : decodedPath;
    
    return key;
  } catch (error) {
    console.error('Error extracting storage key:', error);
    return null;
  }
}

/**
 * Validates if a storage key follows our expected structure
 */
function validateStorageKey(key: string): boolean {
  // Check if the key matches any of our expected patterns
  const patterns = [
    /^menu\/[^/]+\/[^/]+\/menuItems\/[^/]+\/\d+-[^/]+$/, // Menu items
    /^restaurant\/[^/]+\/banner\/\d+-[^/]+$/, // Restaurant banners
    /^restaurant\/[^/]+\/[^/]+\/banner\/\d+-[^/]+$/, // Location banners
    /^restaurant\/[^/]+\/logo\/\d+-[^/]+$/ // Restaurant logos
  ];

  return patterns.some(pattern => pattern.test(key));
}

/**
 * Migrates image URLs to storage keys
 */
async function migrateImageUrls(dryRun: boolean = true, restaurantId?: string, verbose: boolean = false): Promise<MigrationReport> {
  const report: MigrationReport = {
    totalRecords: 0,
    processedRecords: 0,
    successfulConversions: 0,
    failedConversions: 0,
    skippedRecords: 0,
    errors: [],
    changes: []
  };

  try {
    // Fetch all menu items with image URLs
    const { data: menuItems, errors: menuItemErrors } = await client.models.MenuItem.list({
      filter: {
        imageUrl: { attributeExists: true }
      },
      limit: 500 // Limit to 500 records per query to avoid timeouts
    });

    if (menuItemErrors) {
      console.error('Error fetching menu items:', menuItemErrors);
      throw new Error('Failed to fetch menu items');
    }

    // Fetch all restaurants with image URLs
    const { data: restaurants, errors: restaurantErrors } = await client.models.Restaurant.list({
      filter: {
        and: [
          { bannerImageUrl: { attributeExists: true } },
          ...(restaurantId ? [{ id: { eq: restaurantId } }] : [])
        ]
      },
      limit: 100 // Limit to 100 records per query
    });

    if (restaurantErrors) {
      console.error('Error fetching restaurants:', restaurantErrors);
      throw new Error('Failed to fetch restaurants');
    }

    // Fetch all restaurant locations with image URLs
    const { data: locations, errors: locationErrors } = await client.models.RestaurantLocation.list({
      filter: {
        and: [
          { bannerImageUrl: { attributeExists: true } },
          ...(restaurantId ? [{ restaurantId: { eq: restaurantId } }] : [])
        ]
      },
      limit: 100 // Limit to 100 records per query
    });

    if (locationErrors) {
      console.error('Error fetching locations:', locationErrors);
      throw new Error('Failed to fetch locations');
    }

    report.totalRecords = (menuItems?.length || 0) + 
                         (restaurants?.length || 0) + 
                         (locations?.length || 0);
                         
    console.log(`Found ${menuItems?.length || 0} menu items, ${restaurants?.length || 0} restaurants, and ${locations?.length || 0} locations to process.`);

    // Process menu items
    for (const item of menuItems || []) {
      report.processedRecords++;
      if (!item.imageUrl) {
        report.skippedRecords++;
        continue;
      }

      const storageKey = extractStorageKey(item.imageUrl);
      if (!storageKey) {
        report.failedConversions++;
        report.errors.push({
          recordId: item.id,
          table: 'MenuItem',
          error: 'Failed to extract storage key',
          originalUrl: item.imageUrl
        });
        continue;
      }

      if (!validateStorageKey(storageKey)) {
        report.failedConversions++;
        report.errors.push({
          recordId: item.id,
          table: 'MenuItem',
          error: 'Invalid storage key format',
          originalUrl: item.imageUrl
        });
        continue;
      }

      report.successfulConversions++;
      report.changes.push({
        recordId: item.id,
        table: 'MenuItem',
        originalUrl: item.imageUrl,
        newKey: storageKey
      });

      if (verbose) {
        console.log(`Converting MenuItem ${item.id}: ${item.imageUrl} -> ${storageKey}`);
      }

      if (!dryRun) {
        await client.models.MenuItem.update({
          id: item.id,
          imageUrl: storageKey
        });
      }
    }

    // Process restaurants
    for (const restaurant of restaurants || []) {
      report.processedRecords++;
      
      // Handle banner image
      if (restaurant.bannerImageUrl) {
        const storageKey = extractStorageKey(restaurant.bannerImageUrl);
        if (storageKey && validateStorageKey(storageKey)) {
          report.successfulConversions++;
          report.changes.push({
            recordId: restaurant.id,
            table: 'Restaurant',
            originalUrl: restaurant.bannerImageUrl,
            newKey: storageKey
          });

          if (verbose) {
            console.log(`Converting Restaurant ${restaurant.id}: ${restaurant.bannerImageUrl} -> ${storageKey}`);
          }

          if (!dryRun) {
            await client.models.Restaurant.update({
              id: restaurant.id,
              bannerImageUrl: storageKey
            });
          }
        } else {
          report.failedConversions++;
          report.errors.push({
            recordId: restaurant.id,
            table: 'Restaurant',
            error: 'Invalid banner image URL',
            originalUrl: restaurant.bannerImageUrl
          });
        }
      }
    }

    // Process locations
    for (const location of locations || []) {
      report.processedRecords++;
      if (!location.bannerImageUrl) {
        report.skippedRecords++;
        continue;
      }

      const storageKey = extractStorageKey(location.bannerImageUrl);
      if (!storageKey || !validateStorageKey(storageKey)) {
        report.failedConversions++;
        report.errors.push({
          recordId: location.id,
          table: 'RestaurantLocation',
          error: 'Invalid banner image URL',
          originalUrl: location.bannerImageUrl
        });
        continue;
      }

      report.successfulConversions++;
      report.changes.push({
        recordId: location.id,
        table: 'RestaurantLocation',
        originalUrl: location.bannerImageUrl,
        newKey: storageKey
      });

      if (verbose) {
        console.log(`Converting RestaurantLocation ${location.id}: ${location.bannerImageUrl} -> ${storageKey}`);
      }

      if (!dryRun) {
        await client.models.RestaurantLocation.update({
          id: location.id,
          bannerImageUrl: storageKey
        });
      }
    }

    return report;
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run the migration
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const restaurantIdIndex = args.findIndex(arg => arg === '--restaurant-id' || arg === '-r');
  const verboseIndex = args.findIndex(arg => arg === '--verbose' || arg === '-v');
  
  const restaurantId = restaurantIdIndex !== -1 && args.length > restaurantIdIndex + 1 ? args[restaurantIdIndex + 1] : undefined;
  const verbose = verboseIndex !== -1;
  
  if (restaurantId) {
    console.log(`Running migration for restaurant ID: ${restaurantId}`);
  } else {
    console.log('Running migration for all restaurants');
  }

  if (verbose) {
    console.log('Verbose mode enabled, will show all conversions');
  }

  try {
    console.log('Starting dry run...');
    const report = await migrateImageUrls(true, restaurantId, verbose);
    
    console.log('\n==========================');
    console.log('MIGRATION REPORT SUMMARY');
    console.log('==========================');
    console.log(`Total Records: ${report.totalRecords}`);
    console.log(`Processed Records: ${report.processedRecords}`);
    console.log(`Successful Conversions: ${report.successfulConversions}`);
    console.log(`Failed Conversions: ${report.failedConversions}`);
    console.log(`Skipped Records: ${report.skippedRecords}`);
    
    if (report.errors.length > 0) {
      console.log('\nError Summary:');
      // Group errors by type
      const errorTypes = {};
      report.errors.forEach(error => {
        const key = `${error.table}:${error.error}`;
        errorTypes[key] = (errorTypes[key] || 0) + 1;
      });
      
      // Show count of each error type
      Object.entries(errorTypes).forEach(([key, count]) => {
        const [table, error] = key.split(':');
        console.log(`- ${table}: ${error} (${count} records)`);
      });
      
      console.log('\nDetailed Errors (first 5):');
      report.errors.slice(0, 5).forEach(error => {
        console.log(`- ${error.table} (${error.recordId}): ${error.error}`);
        console.log(`  Original URL: ${error.originalUrl}`);
      });
      
      if (report.errors.length > 5) {
        console.log(`... and ${report.errors.length - 5} more errors`);
      }
    }
    
    if (report.changes.length > 0) {
      // Group changes by table
      const changesByTable = {};
      report.changes.forEach(change => {
        changesByTable[change.table] = (changesByTable[change.table] || 0) + 1;
      });
      
      console.log('\nChanges Summary:');
      Object.entries(changesByTable).forEach(([table, count]) => {
        console.log(`- ${table}: ${count} records will be updated`);
      });
      
      console.log('\nSample Changes (first 5):');
      report.changes.slice(0, 5).forEach(change => {
        console.log(`- ${change.table} (${change.recordId.substring(0, 8)}...)`);
        console.log(`  From: ${change.originalUrl.substring(0, 30)}...`);
        console.log(`  To: ${change.newKey}`);
      });
      
      if (report.changes.length > 5) {
        console.log(`... and ${report.changes.length - 5} more changes`);
      }
    }

    // Ask for confirmation before proceeding with actual migration
    if (report.failedConversions === 0) {
      console.log('\nDry run completed successfully. Do you want to proceed with actual migration? (y/N)');
      
      process.stdin.setEncoding('utf8');
      
      process.stdin.on('data', async (data) => {
        const answer = data.toString().trim();
        if (answer.toLowerCase() === 'y') {
          console.log('\nStarting actual migration...');
          const migrationReport = await migrateImageUrls(false, restaurantId, verbose);
          console.log('Migration completed successfully!');
          console.log(`Converted ${migrationReport.successfulConversions} records.`);
        } else {
          console.log('Migration cancelled.');
        }
        process.exit(0);
      });
    } else {
      console.log('\nDry run completed with errors, but some records can be fixed.');
      console.log(`${report.successfulConversions} records can be converted successfully.`);
      console.log(`${report.failedConversions} records have errors and will be skipped.`);
      console.log('\nDo you want to proceed with converting only the valid records? (y/N)');
      
      process.stdin.setEncoding('utf8');
      
      process.stdin.on('data', async (data) => {
        const answer = data.toString().trim();
        if (answer.toLowerCase() === 'y') {
          console.log('\nStarting partial migration (only converting valid records)...');
          const migrationReport = await migrateImageUrls(false, restaurantId, verbose);
          console.log('Partial migration completed successfully!');
          console.log(`Converted ${migrationReport.successfulConversions} records.`);
        } else {
          console.log('Migration cancelled.');
        }
        process.exit(0);
      });
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main(); 