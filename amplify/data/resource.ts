import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { nashWebhook } from '../functions/nash-webhook/resource';
import { stripePayment } from '../functions/stripe-payment/resource';

const schema = a.schema({
  // Custom types need to be defined inside the schema
  Location: a.customType({
    lat: a.float(),
    lng: a.float(),
  }),

  Driver: a.customType({
    id: a.string(),
    name: a.string(), 
    phone: a.string(),
    currentLocation: a.ref('Location'),
  }),

  // Add delivery-related custom types
  DeliveryStatus: a.enum([
    'PENDING', 
    'CONFIRMED', 
    'PICKING_UP', 
    'PICKED_UP', 
    'DELIVERING', 
    'COMPLETED', 
    'CANCELLED', 
    'FAILED'
  ]),

  DeliveryInfo: a.customType({
    deliveryId: a.string(),
    provider: a.string(),
    fee: a.float(),
    estimatedPickupTime: a.string(),
    estimatedDeliveryTime: a.string(),
    trackingUrl: a.string(),
    status: a.ref('DeliveryStatus'),
    quoteId: a.string(),
  }),

  RestaurantStaff: a
    .model({
      email: a.string(),
      restaurantId: a.string(),
      restaurant: a.belongsTo('Restaurant', 'restaurantId'),
      role: a.enum(['OWNER', 'MANAGER', 'STAFF']),
      firstName: a.string(),
      lastName: a.string(),
      isActive: a.boolean(),
    })
    .authorization((allow) => [
      allow.publicApiKey(),
      allow.owner()
    ]),

  // New model for restaurant locations
  RestaurantLocation: a
    .model({
      name: a.string(),
      slug: a.string(),
      description: a.string(),
      bannerImageUrl: a.string(),
      address: a.string(),
      city: a.string(),
      state: a.string(),
      zip: a.string(),
      phoneNumber: a.string(),
      restaurantId: a.string(),
      restaurant: a.belongsTo('Restaurant', 'restaurantId'),
      menuCategories: a.hasMany('MenuCategory', 'locationId'),
      orders: a.hasMany('Order', 'locationId'),
      isActive: a.boolean(),
      isOpen: a.boolean().default(false),
      printerConfig: a.customType({
        printerType: a.string(),
        ipAddress: a.string(),
        port: a.integer(),
        isEnabled: a.boolean(),
      }),
    })
    .authorization((allow) => [
      allow.publicApiKey(),
      allow.owner()
    ]),

  Restaurant: a
    .model({
      name: a.string(),
      slug: a.string(),
      description: a.string(),
      bannerImageUrl: a.string(),
      menuCategories: a.hasMany('MenuCategory', 'restaurantId'),
      orders: a.hasMany('Order', 'restaurantId'),
      // Add locations relationship
      locations: a.hasMany('RestaurantLocation', 'restaurantId'),
      address: a.string(),
      city: a.string(),
      state: a.string(),
      zip: a.string(),
      phone: a.string(),
      ownerEmail: a.string(),
      staff: a.hasMany('RestaurantStaff', 'restaurantId'),
      isActive: a.boolean(),
      isOpen: a.boolean().default(false),
      isChain: a.boolean(),
      printerConfig: a.customType({
        printerType: a.string(),
        ipAddress: a.string(),
        port: a.integer(),
        isEnabled: a.boolean(),
      }),
      stripeAccountId: a.string(),
      stripeAccountStatus: a.enum(['PENDING', 'ACTIVE', 'REJECTED']),
    })
    .authorization((allow) => [
      allow.publicApiKey(),
      allow.owner()
    ]),

  MenuCategory: a
    .model({
      name: a.string(),
      description: a.string(),
      menuItems: a.hasMany('MenuItem', 'categoryId'),
      restaurantId: a.string(),
      restaurant: a.belongsTo('Restaurant', 'restaurantId'),
      // Add optional location relationship for location-specific menu categories
      locationId: a.string(),
      location: a.belongsTo('RestaurantLocation', 'locationId'),
    })
    .authorization((allow) => [
      allow.publicApiKey()
    ]),

  MenuItem: a
    .model({
      name: a.string(),
      description: a.string(),
      price: a.float(),
      imageUrl: a.string(),
      categoryId: a.string(),
      category: a.belongsTo('MenuCategory', 'categoryId'),
      orderItems: a.hasMany('OrderItem', 'menuItemId')
    })
    .authorization((allow) => [
      allow.publicApiKey()
    ]),

  Order: a
    .model({
      restaurantId: a.string(),
      restaurant: a.belongsTo('Restaurant', 'restaurantId'),
      // Add optional location fields
      locationId: a.string(),
      location: a.belongsTo('RestaurantLocation', 'locationId'),
      customerEmail: a.string(),
      items: a.hasMany('OrderItem', 'orderId'),
      total: a.float(),
      status: a.enum(['PENDING', 'PAYMENT_PROCESSING', 'PAID', 'RESTAURANT_ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED']),
      stripeCheckoutSessionId: a.string(),
      specialInstructions: a.string(),
      deliveryAddress: a.string(),
      driver: a.ref('Driver'),
      createdAt: a.string(),
      updatedAt: a.string(),
      externalId: a.string(),
      trackingInfo: a.customType({
        source: a.string(),
        campaignId: a.string(),
        clickId: a.string()
      }),
      // Add delivery-related fields
      isDelivery: a.boolean(),
      deliveryFee: a.float(),
      deliveryInfo: a.ref('DeliveryInfo'),
      customerName: a.string(),
      customerPhone: a.string(),
    })
    .authorization((allow) => [
      allow.publicApiKey()
    ]),

  OrderItem: a
    .model({
      menuItemId: a.string(),
      menuItem: a.belongsTo('MenuItem', 'menuItemId'),
      quantity: a.integer(),
      specialInstructions: a.string(),
      orderId: a.string(),
      order: a.belongsTo('Order', 'orderId')
    })
    .authorization((allow) => [
      allow.publicApiKey()
    ])
})
.authorization(allow => [allow.resource(nashWebhook), allow.resource(stripePayment)]); // allow query and subscription operations but not mutations


export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "apiKey",
    // API Key is used for a.allow.public() rules
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
