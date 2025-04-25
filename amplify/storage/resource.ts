import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'restaurantStorage',
  access: (allow) => ({
    '{restaurantId}/default/*': [
      // Allow any authenticated user to read restaurant images
      allow.authenticated.to(['read']),
      allow.guest.to(['read']),
      // Allow only restaurant staff to upload/modify restaurant images
      allow.groups(['OWNER', 'MANAGER', 'STAFF']).to(['read', 'write', 'delete'])
    ],
    // Future support for location-specific images
    '{restaurantId}/{locationId}/*': [
      allow.authenticated.to(['read']),
      allow.guest.to(['read']),
      allow.groups(['OWNER', 'MANAGER', 'STAFF']).to(['read', 'write', 'delete'])
    ]
  })
}); 