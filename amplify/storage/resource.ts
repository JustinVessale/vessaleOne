import { defineStorage } from '@aws-amplify/backend-storage';

// Define storage for restaurant images with path-based organization
export const storage = defineStorage({
  name: 'restaurantImages',
  access: (allow) => ({
    // Public read access to all images
    'restaurant/*': [
      allow.guest.to(['read']),
      // Authenticated users can write to restaurant images
      allow.authenticated.to(['read', 'write', 'delete'])
    ],
    'menu/*': [
      allow.guest.to(['read']),
      // Authenticated users can write to menu images
      allow.authenticated.to(['read', 'write', 'delete'])
    ],
    
    // Restaurant-specific paths with location support
    'restaurant/{restaurantId}/{locationId}/image/*': [
      allow.guest.to(['read']),
      allow.authenticated.to(['read', 'write', 'delete'])
    ],
    
    // Menu item-specific paths with location support
    'menu/{restaurantId}/{locationId}/menuItems/{menuItemId}/*': [
      allow.guest.to(['read']), 
      allow.authenticated.to(['read', 'write', 'delete'])
    ]
  })
}); 