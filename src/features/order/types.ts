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

export type Order = {
  id: string;
  total: number;
  restaurantId: string;
  status: OrderStatus;
  stripePaymentIntentId?: string;
  customerEmail: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
  // Add other order fields as needed
};

export type OrderItem = {
  id: string;
  menuItemId: string;
  quantity: number;
  price: number;
  name: string;
  specialInstructions?: string;
}; 