import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../amplify/data/resource';
import { createDefaultBusinessHours, serializeBusinessHours } from '../src/utils/business-hours';

// Use API key for all operations
const client = generateClient<Schema>({
  authMode: 'apiKey'
});

/**
 * Update existing restaurants with default business hours and timezone
 * Execute from the project root with:
 * npx tsx scripts/update-restaurant-hours.ts
 */
async function updateRestaurantHours() {
  try {
    console.log('🔄 Updating restaurants with default business hours...');
    
    // Fetch all restaurants
    const { data: restaurants, errors } = await client.models.Restaurant.list({
      selectionSet: ['id', 'name', 'city', 'state']
    });

    if (errors) {
      throw new Error(`Error fetching restaurants: ${JSON.stringify(errors)}`);
    }
    
    if (!restaurants || restaurants.length === 0) {
      console.log('No restaurants found to update');
      return;
    }

    console.log(`Found ${restaurants.length} restaurants to update`);

    // Create default business hours
    const defaultHours = createDefaultBusinessHours();
    const defaultHoursJson = serializeBusinessHours(defaultHours);

    // Determine timezone based on state (simplified mapping)
    const getTimezoneFromState = (state: string): string => {
      const stateTimezoneMap: Record<string, string> = {
        'CA': 'America/Los_Angeles',
        'WA': 'America/Los_Angeles',
        'OR': 'America/Los_Angeles',
        'NV': 'America/Los_Angeles',
        'ID': 'America/Boise',
        'MT': 'America/Denver',
        'WY': 'America/Denver',
        'CO': 'America/Denver',
        'UT': 'America/Denver',
        'AZ': 'America/Phoenix',
        'NM': 'America/Denver',
        'ND': 'America/Chicago',
        'SD': 'America/Chicago',
        'NE': 'America/Chicago',
        'KS': 'America/Chicago',
        'OK': 'America/Chicago',
        'TX': 'America/Chicago',
        'MN': 'America/Chicago',
        'IA': 'America/Chicago',
        'MO': 'America/Chicago',
        'AR': 'America/Chicago',
        'LA': 'America/Chicago',
        'WI': 'America/Chicago',
        'IL': 'America/Chicago',
        'MI': 'America/New_York',
        'IN': 'America/New_York',
        'OH': 'America/New_York',
        'KY': 'America/New_York',
        'TN': 'America/Chicago',
        'MS': 'America/Chicago',
        'AL': 'America/Chicago',
        'GA': 'America/New_York',
        'FL': 'America/New_York',
        'SC': 'America/New_York',
        'NC': 'America/New_York',
        'VA': 'America/New_York',
        'WV': 'America/New_York',
        'MD': 'America/New_York',
        'DE': 'America/New_York',
        'NJ': 'America/New_York',
        'PA': 'America/New_York',
        'NY': 'America/New_York',
        'CT': 'America/New_York',
        'RI': 'America/New_York',
        'MA': 'America/New_York',
        'NH': 'America/New_York',
        'VT': 'America/New_York',
        'ME': 'America/New_York',
        'AK': 'America/Anchorage',
        'HI': 'Pacific/Honolulu',
      };
      
      return stateTimezoneMap[state] || 'America/Los_Angeles'; // Default to PT
    };

    // Update each restaurant
    let updatedCount = 0;
    let errorCount = 0;

    for (const restaurant of restaurants) {
      try {
        const timezone = getTimezoneFromState(restaurant.state || 'CA');
        
        console.log(`Updating ${restaurant.name} (${restaurant.city}, ${restaurant.state}) with timezone: ${timezone}`);
        
        const { errors: updateErrors } = await client.models.Restaurant.update({
          id: restaurant.id,
          timezone,
          businessHours: defaultHoursJson
        });

        if (updateErrors) {
          console.error(`❌ Error updating ${restaurant.name}:`, updateErrors);
          errorCount++;
        } else {
          console.log(`✅ Updated ${restaurant.name}`);
          updatedCount++;
        }
      } catch (error) {
        console.error(`❌ Error updating ${restaurant.name}:`, error);
        errorCount++;
      }
    }

    // Update restaurant locations as well
    console.log('\n🔄 Updating restaurant locations...');
    
    const { data: locations, errors: locationErrors } = await client.models.RestaurantLocation.list({
      selectionSet: ['id', 'name', 'city', 'state']
    });

    if (locationErrors) {
      console.error('Error fetching locations:', locationErrors);
    } else if (locations && locations.length > 0) {
      console.log(`Found ${locations.length} locations to update`);

      for (const location of locations) {
        try {
          const timezone = getTimezoneFromState(location.state || 'CA');
          
          console.log(`Updating location ${location.name} (${location.city}, ${location.state}) with timezone: ${timezone}`);
          
          const { errors: updateErrors } = await client.models.RestaurantLocation.update({
            id: location.id,
            timezone,
            businessHours: defaultHoursJson
          });

          if (updateErrors) {
            console.error(`❌ Error updating location ${location.name}:`, updateErrors);
            errorCount++;
          } else {
            console.log(`✅ Updated location ${location.name}`);
            updatedCount++;
          }
        } catch (error) {
          console.error(`❌ Error updating location ${location.name}:`, error);
          errorCount++;
        }
      }
    }

    console.log('\n📊 Update Summary:');
    console.log(`✅ Successfully updated: ${updatedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('🎉 Restaurant hours update complete!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the script
updateRestaurantHours(); 