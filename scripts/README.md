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