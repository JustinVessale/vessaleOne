# Database Scripts

This directory contains utility scripts for managing restaurant data in the Vessale system.

## Available Scripts

### `create-restaurant.ts`
Interactive script to create a new restaurant record.

**Usage:**
```bash
npx tsx scripts/create-restaurant.ts
```

**What it does:**
- Prompts for all required restaurant information
- Validates input data (email, phone, ZIP code)
- Creates a restaurant record in the database
- Does NOT create menu items or categories (use Restaurant Portal for that)

**Required information:**
- Restaurant name
- Description
- Address (street, city, state, ZIP)
- Phone number
- Owner email
- Restaurant type (chain or single location)
- Optional: Banner image URL
- Optional: Printer configuration

### `update-restaurant-owner.ts`
Interactive script to update the owner email of a specific restaurant.

**Usage:**
```bash
npx tsx scripts/update-restaurant-owner.ts
```

**What it does:**
- Finds restaurant by ID or slug
- Updates the restaurant's ownerEmail field
- Updates or creates RestaurantStaff records for the new owner
- Handles existing staff records for the old owner
- Provides confirmation and summary of changes

**Use cases:**
- Transferring restaurant ownership
- Correcting owner email addresses
- Updating contact information for restaurant owners

**Process:**
1. Identifies restaurant by ID or slug
2. Updates restaurant.ownerEmail
3. Updates existing staff records for old owner (if any)
4. Creates or updates staff record for new owner with OWNER role
5. Provides next steps for Auth user setup

### `create-multi-restaurant-user.ts`
Interactive script to give a user access to multiple restaurants for testing the restaurant selector.

**Usage:**
```bash
npx tsx scripts/create-multi-restaurant-user.ts
```

**What it does:**
- Lists all active restaurants in the system
- Allows you to select which restaurants a user should have access to
- Creates staff records for the user at each selected restaurant
- Perfect for testing the multi-restaurant selector functionality

**Use cases:**
- Testing the restaurant selector UI
- Setting up chain restaurant owners
- Creating demo accounts with access to multiple restaurants

### `seed-data.ts`
Creates a complete restaurant setup with sample data.

**Usage:**
```bash
npx tsx scripts/seed-data.ts
```

**What it creates:**
- Restaurant record (World Famous Grill)
- Restaurant locations (Bell, Downey)
- Staff members (owner, manager, staff)
- Menu categories (Appetizers, Main Courses, Sides)
- Sample menu items

### `seed-arth-restaurant.ts`
Creates a restaurant setup for Arth restaurant.

**Usage:**
```bash
npx tsx scripts/seed-arth-restaurant.ts
```

### `list-restaurants.ts`
Lists all restaurants in the database.

**Usage:**
```bash
npx tsx scripts/list-restaurants.ts
```

### `get-restaurant-info.ts`
Interactive script to get detailed information about a restaurant by slug.

**Usage:**
```bash
npx tsx scripts/get-restaurant-info.ts
```

### `import-menu-csv.ts`
Enhanced CSV import script for menu items with robust format detection.

**Usage:**
```bash
npx tsx scripts/import-menu-csv.ts
```

**Features:**
- Auto-detects CSV format (standard, Cafe Laurent, etc.)
- Handles dollar signs and commas in prices
- Skips empty rows
- Generates default descriptions for missing descriptions
- Creates categories automatically
- Supports multiple column name variations

## Multi-Restaurant Access

The system now supports users with access to multiple restaurants. When a user logs in and has access to multiple restaurants, they will see a **Restaurant Selector** that allows them to choose which restaurant they want to manage.

### How it works:

1. **Authentication**: User logs in with their email
2. **Access Check**: System checks how many restaurants the user has access to
3. **Single Restaurant**: If only one restaurant, automatically proceeds to dashboard
4. **Multiple Restaurants**: If multiple restaurants, shows restaurant selector
5. **Selection**: User chooses which restaurant to manage
6. **Dashboard**: User proceeds to the selected restaurant's dashboard

### Setting up multi-restaurant access:

1. **Create restaurants** using `create-restaurant.ts`
2. **Create multi-restaurant user** using `create-multi-restaurant-user.ts`
3. **Create Auth user** for the email address
4. **Test the flow** by logging in

### Restaurant Selector Features:

- **Visual cards** for each restaurant with name, description, and address
- **Role badges** showing user's role at each restaurant (OWNER, MANAGER, STAFF)
- **Chain indicators** for chain restaurants
- **Auto-selection** for single restaurant access
- **Smooth navigation** to dashboard after selection

## Prerequisites

- Node.js and npm installed
- Amplify backend deployed
- `amplify_outputs.json` file present in project root
- Required dependencies installed (`aws-amplify`, `tsx`)

## Notes

- All scripts use API key authentication for database operations
- Scripts are designed for development and testing purposes
- For production use, ensure proper authentication and authorization
- Restaurant images should be uploaded through the Restaurant Portal UI for proper S3 integration
- Multi-restaurant access is perfect for chain restaurants and testing scenarios

# Restaurant Management Scripts

This directory contains utility scripts to help manage the restaurant data in your application. These scripts are particularly useful for diagnosing and resolving issues with duplicate restaurants and misassigned orders.

## Problem: Duplicate Restaurants

The most common issue these scripts address is having two or more restaurants with the same name but different IDs in the database. This can happen when:

- The seed script is run multiple times
- Restaurants are created manually through different interfaces
- Data migration processes create duplicates

Having duplicate restaurants can cause several problems:
- Orders are assigned to different restaurant IDs
- Restaurant staff can't see all orders
- Dashboard displays incorrect data

## Solution: 4-Step Process

Follow these four steps to resolve duplicate restaurant issues:

### Step 1: Identify the Duplicates
```bash
npx tsx scripts/list-restaurants.ts
```
This will show all restaurants in your database and highlight any duplicates. Make note of the restaurant IDs.

### Step 2: Check Order Distribution
```bash
npx tsx scripts/check-orders.ts
```
This will show how orders are distributed across different restaurant IDs. If you already know which restaurant ID is the "correct" one (the one you want to keep), you can specify it:
```bash
npx tsx scripts/check-orders.ts CORRECT_RESTAURANT_ID
```

### Step 3: Reassign Orders to the Correct Restaurant
```bash
npx tsx scripts/fix-order-restaurant-ids.ts CORRECT_RESTAURANT_ID
```
This will update all orders to use the correct restaurant ID. The script will:
- Verify the restaurant exists
- Show you which orders will be updated
- Process the updates and provide a success report

### Step 4: Delete the Duplicate Restaurant(s)
```bash
npx tsx scripts/delete-restaurant.ts DUPLICATE_RESTAURANT_ID
```
This will permanently delete the duplicate restaurant. Make sure you've:
- Reassigned all orders first (Step 3)
- Confirmed this is the duplicate you want to remove
- Backed up any data you might need

## Important Notes

- **Always run scripts in the correct order** - list, check, fix, delete
- **Make note of restaurant IDs** before making changes
- **Back up your data** before deleting restaurants
- If you have associated staff accounts with the duplicate restaurant, make sure to reassign them first or recreate them after fixing the issue

## Troubleshooting

If you encounter issues:

1. **Script errors connecting to the database**: Make sure your Amplify configuration is correct and you're running in the right environment
2. **Script not deleting the restaurant**: The restaurant might have associated records (staff, menu items, etc.) that prevent deletion
3. **Orders not showing up after fix**: Make sure to refresh your application and clear any local storage/cache 