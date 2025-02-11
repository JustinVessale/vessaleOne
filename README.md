# Vessale Restaurant Ordering System

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

- 💫 **Modern UI/UX**
  - Mobile-first responsive design
  - Smooth animations and transitions
  - Loading states and error handling
  - Touch-friendly interface
  - Accessible components

## Tech Stack

- **Frontend Framework**: React with TypeScript
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/UI, Radix UI
- **State Management**: React Query, React Context
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
│   └── shared/
│       └── components/
│           └── Layout.tsx
└── App.tsx

```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- AWS Account with Amplify CLI configured

### Installation

1. Clone the repository:
\`\`\`bash
git clone [repository-url]
cd vessaleOne
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Configure AWS Amplify:
\`\`\`bash
amplify init
amplify push
\`\`\`

4. Start the development server:
\`\`\`bash
npm run dev
\`\`\`

## Development

### Key Components

- **RestaurantPage**: Main page displaying restaurant information and menu categories
- **MenuCategory**: Displays a category of menu items in a responsive grid
- **MenuItem**: Individual menu item card with image, description, and add-to-cart functionality
- **Cart**: Shopping cart slide-out panel with item management
- **Layout**: Main application layout with header and footer

### State Management

- **CartContext**: Global cart state management using React Context
- **React Query**: Server state management for API calls
- **AWS Amplify**: Backend state and data management

### Styling

- Utilizes Tailwind CSS for responsive design
- Custom color scheme defined in tailwind.config.js
- Mobile-first approach with responsive breakpoints
- Consistent spacing and typography system

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

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## Future Enhancements

- [ ] User authentication
- [ ] Order history
- [ ] Restaurant reviews and ratings
- [ ] Real-time order tracking
- [ ] Multiple restaurant support
- [ ] Payment integration
- [ ] Delivery address management

## License

[License Type] - See LICENSE file for details