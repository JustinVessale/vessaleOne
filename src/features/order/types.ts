import { Schema } from '../../../amplify/data/resource';

export const OrderStatus = {
  PENDING: 'PENDING',
  PAYMENT_PROCESSING: 'PAYMENT_PROCESSING',
  PAID: 'PAID',
  PREPARING: 'PREPARING',
  READY: 'READY',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type OrderStatus = typeof OrderStatus[keyof typeof OrderStatus];

// Use Amplify's generated types
export type Order = Schema['Order'];
export type OrderItem = Schema['OrderItem']; 