import { defineStorage } from '@aws-amplify/backend-storage';

// Define S3 storage for restaurant images with path-based organization
export const storage = defineStorage({
  name: 'restaurantImages',
  access: (allow) => ({
    // Public read access to all images
    'restaurant/*': [
      allow.guest.to(['read']),
      // Authenticated users can write to restaurant images
      // Note: Application-level permissions will enforce which restaurants a user can modify
      allow.authenticated.to(['read', 'write', 'delete'])
    ],
    'menu/*': [
      allow.guest.to(['read']),
      // Authenticated users can write to menu images
      // Note: Application-level permissions will enforce which menu items a user can modify
      allow.authenticated.to(['read', 'write', 'delete'])
    ],
    // Use specific restaurant ID paths for better organization
    'restaurant/${restaurantId}/*': [
      allow.guest.to(['read']),
      allow.authenticated.to(['read', 'write', 'delete'])
    ],
    'menu/${restaurantId}/*': [
      allow.guest.to(['read']), 
      allow.authenticated.to(['read', 'write', 'delete'])
    ]
  })
}); 