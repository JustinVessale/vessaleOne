# Vessale Restaurant Ordering System

> **⚠️ IMPORTANT: This project uses AWS Amplify Gen 2 exclusively. All commands, patterns, and solutions MUST follow Gen 2 paradigms. Do NOT use Gen 1 commands like `amplify push` - only use Gen 2 commands like `npx ampx push` or `npx ampx sandbox`.**

A modern, responsive web application for restaurant menu browsing and online ordering, built with React, TypeScript, and AWS Amplify Gen 2.

## Features

- 🍽️ **Restaurant Menus**
  - Dynamic menu categories and items
  - High-quality image display with proper aspect ratios
  - Responsive grid layout for optimal viewing on all devices
  - Smart loading states with skeleton placeholders

- 🛒 **Shopping Cart**
  - Real-time cart updates
  - Add/remove items
  - Adjust quantities
  - Add special instructions per item
  - Persistent cart state
  - Sliding cart panel on desktop and mobile

- 💳 **Payment Processing**
  - Secure checkout with Stripe integration
  - Credit card processing
  - Payment status tracking
  - Order confirmation

- 🚚 **Delivery Management**
  - Nash delivery integration
  - Real-time delivery tracking
  - Delivery quotes and estimates
  - Address validation and management

- 📋 **Order Management**
  - Order confirmation and details
  - Order history
  - Order status tracking

- 💫 **Modern UI/UX**
  - Mobile-first responsive design
  - Smooth animations and transitions with Framer Motion
  - Loading states and error handling
  - Touch-friendly interface
  - Accessible components
  - Toast notifications

## Tech Stack

- **Frontend Framework**: React with TypeScript
- **Routing**: React Router v7
- **Styling**: Tailwind CSS v4
- **UI Components**: Shadcn/UI, Radix UI
- **State Management**: TanStack React Query, React Context
- **Animation**: Framer Motion
- **Payment Processing**: Stripe
- **Delivery Integration**: Nash
- **Backend**: AWS Amplify Gen 2
- **API**: GraphQL
- **Build Tools**: Vite

## Project Structure

```
src/
├── features/
│   ├── restaurant/
│   │   └── components/
│   │       └── RestaurantPage.tsx
│   ├── menu/
│   │   └── components/
│   │       ├── MenuCategory.tsx
│   │       └── MenuItem.tsx
│   ├── cart/
│   │   ├── components/
│   │   │   └── Cart.tsx
│   │   └── context/
│   │       └── CartContext.tsx
│   ├── payment/
│   │   ├── components/
│   │   │   ├── CheckoutPage.tsx
│   │   │   ├── PaymentForm.tsx
│   │   │   └── StripeProvider.tsx
│   │   └── api/
│   │       └── paymentApi.ts
│   ├── delivery/
│   │   ├── components/
│   │   │   ├── DeliveryForm.tsx
│   │   │   ├── DeliveryQuote.tsx
│   │   │   └── DeliveryTracking.tsx
│   │   └── hooks/
│   │       └── useDelivery.ts
│   ├── orders/
│   │   └── components/
│   │       └── OrderConfirmationPage.tsx
│   └── shared/
│       └── components/
│           └── Layout.tsx
├── components/
│   └── ui/
│       └── [shadcn components]
├── lib/
│   └── utils.ts
├── hooks/
│   └── [custom hooks]
└── App.tsx

```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- AWS Account with Amplify CLI configured
- Stripe account for payment processing
- Nash account for delivery integration

### Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd vessaleOne
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Create a `.env.local` file with the following variables:
```
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
VITE_NASH_API_KEY=your_nash_api_key
```

4. Configure AWS Amplify Gen 2:
```bash
npx ampx sandbox
```

5. Start the development server:
```bash
npm run dev
```

## Development

### Key Components

- **RestaurantPage**: Main page displaying restaurant information and menu categories
- **MenuCategory**: Displays a category of menu items in a responsive grid
- **MenuItem**: Individual menu item card with image, description, and add-to-cart functionality
- **Cart**: Shopping cart slide-out panel with item management
- **CheckoutPage**: Handles payment processing with Stripe integration
- **DeliveryForm**: Collects and validates delivery information
- **DeliveryTracking**: Real-time tracking of delivery status
- **OrderConfirmationPage**: Displays order details and confirmation
- **Layout**: Main application layout with header and footer

### State Management

- **CartContext**: Global cart state management using React Context
- **TanStack React Query**: Server state management for API calls
- **AWS Amplify**: Backend state and data management

### Styling

- Utilizes Tailwind CSS v4 for responsive design
- Custom color scheme defined in tailwind.config.js
- Mobile-first approach with responsive breakpoints
- Consistent spacing and typography system
- Framer Motion for smooth animations and transitions

## Data Model

### Restaurant
- id: ID!
- name: String!
- description: String
- imageUrl: String
- menuCategories: [MenuCategory]

### MenuCategory
- id: ID!
- name: String!
- description: String
- menuItems: [MenuItem]

### MenuItem
- id: ID!
- name: String!
- description: String
- price: Float!
- imageUrl: String
- categoryId: ID!

### Order
- id: ID!
- userId: ID!
- items: [OrderItem]
- status: OrderStatus!
- total: Float!
- deliveryAddress: Address
- paymentId: String
- createdAt: AWSDateTime!

### OrderItem
- id: ID!
- menuItemId: ID!
- quantity: Int!
- specialInstructions: String
- price: Float!

## Storage Implementation

### S3 Storage Structure

The project uses AWS S3 through Amplify Gen 2 for storing restaurant and menu images. The storage is organized in a hierarchical structure:

```
restaurant/
  ├── {restaurantId}/
  │   └── {locationId}/
  │       └── image/
  │           └── {timestamp}-{filename}
  │
menu/
  └── {restaurantId}/
      └── {locationId}/
          └── menuItems/
              └── {menuItemId}/
                  └── {timestamp}-{filename}
```

### Access Control

Storage access is managed through Amplify Gen 2's storage configuration:

- **Public Access**: All images are publicly readable
- **Authenticated Access**: Authenticated users can:
  - Upload new images
  - Delete existing images
  - Read all images

### Usage

The project provides utility functions for managing images:

```typescript
// Restaurant Images
const { key, url } = await restaurantImageHelper.upload(
  file,
  restaurantId,
  locationId
);

// Menu Item Images
const { key, url } = await menuItemImageHelper.upload(
  file,
  restaurantId,
  menuItemId,
  locationId
);

// Delete images
await restaurantImageHelper.delete(imageUrl);
await menuItemImageHelper.delete(imageUrl);
```

### Key Features

- **Automatic File Naming**: Files are automatically renamed with timestamps to prevent conflicts
- **Path Organization**: Images are organized by restaurant, location, and menu item
- **URL Management**: Helper functions for generating and managing image URLs
- **Type Safety**: Full TypeScript support for all storage operations

### Best Practices

1. Always use the provided helper functions instead of direct S3 operations
2. Images are automatically made public for reading
3. Only authenticated users can upload or delete images
4. Use the appropriate helper function based on the image type (restaurant vs menu item)

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## Completed Features
- [x] Restaurant menu display
- [x] Shopping cart functionality
- [x] Stripe payment integration
- [x] Nash delivery integration
- [x] Order confirmation
- [x] Responsive UI with animations

## Future Enhancements

- [ ] User authentication
- [ ] Restaurant reviews and ratings
- [ ] Multiple restaurant support

## License

[License Type] - See LICENSE file for details