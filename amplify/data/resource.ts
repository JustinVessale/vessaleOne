import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

/*== STEP 1 ===============================================================
The section below creates a Todo database table with a "content" field. Try
adding a new "isDone" field as a boolean. The authorization rule below
specifies that any user authenticated via an API key can "create", "read",
"update", and "delete" any "Todo" records.
=========================================================================*/

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

  Restaurant: a
    .model({
      name: a.string(),
      slug: a.string(),
      description: a.string(),
      imageUrl: a.string(),
      menuCategories: a.hasMany('MenuCategory', 'restaurantId'),
      orders: a.hasMany('Order', 'restaurantId')
    })
    .authorization((allow) => [allow.publicApiKey()]),

  MenuCategory: a
    .model({
      name: a.string(),
      description: a.string(),
      menuItems: a.hasMany('MenuItem', 'categoryId'),
      restaurantId: a.string(),
      restaurant: a.belongsTo('Restaurant', 'restaurantId')
    })
    .authorization((allow) => [allow.publicApiKey()]),

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
    .authorization((allow) => [allow.publicApiKey()]),

  Order: a
    .model({
      restaurantId: a.string(),
      restaurant: a.belongsTo('Restaurant', 'restaurantId'),
      customerEmail: a.string(),
      items: a.hasMany('OrderItem', 'orderId'),
      total: a.float(),
      status: a.enum(['PENDING', 'PAYMENT_PROCESSING', 'PAID', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED']),
      stripePaymentIntentId: a.string(),
      specialInstructions: a.string(),
      deliveryAddress: a.string(),
      driver: a.ref('Driver'),
      createdAt: a.string(),
      updatedAt: a.string(),
      trackingInfo: a.customType({
        source: a.string(),
        campaignId: a.string(),
        clickId: a.string()
      })
    })
    .authorization((allow) => [allow.publicApiKey()]),

  OrderItem: a
    .model({
      menuItemId: a.string(),
      menuItem: a.belongsTo('MenuItem', 'menuItemId'),
      quantity: a.integer(),
      specialInstructions: a.string(),
      orderId: a.string(),
      order: a.belongsTo('Order', 'orderId')
    })
    .authorization((allow) => [allow.publicApiKey()])
});

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

/*== STEP 2 ===============================================================
Go to your frontend source code. From your client-side code, generate a
Data client to make CRUDL requests to your table. (THIS SNIPPET WILL ONLY
WORK IN THE FRONTEND CODE FILE.)

Using JavaScript or Next.js React Server Components, Middleware, Server 
Actions or Pages Router? Review how to generate Data clients for those use
cases: https://docs.amplify.aws/gen2/build-a-backend/data/connect-to-API/
=========================================================================*/

/*
"use client"
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>() // use this Data client for CRUDL requests
*/

/*== STEP 3 ===============================================================
Fetch records from the database and use them in your frontend component.
(THIS SNIPPET WILL ONLY WORK IN THE FRONTEND CODE FILE.)
=========================================================================*/

/* For example, in a React component, you can use this snippet in your
  function's RETURN statement */
// const { data: todos } = await client.models.Todo.list()

// return <ul>{todos.map(todo => <li key={todo.id}>{todo.content}</li>)}</ul>
