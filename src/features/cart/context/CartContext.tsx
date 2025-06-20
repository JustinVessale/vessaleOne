import { createContext, useContext, useReducer, ReactNode, useRef } from 'react';
import { PLATFORM_CONFIG } from '@/config/constants';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../../../amplify/data/resource';

const client = generateClient<Schema>();

export type CartItem = {
  id: string;
  menuItemId: string;
  restaurantId: string;
  locationId?: string;
  name: string;
  price: number;
  quantity: number;
  specialInstructions?: string;
  imageUrl?: string;
};

type CartState = {
  items: CartItem[];
  isOpen: boolean;
  lastRestaurantCheck: number | null;
  restaurantIsOpen: boolean | null;
  locationIsOpen: boolean | null;
};

type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'UPDATE_INSTRUCTIONS'; payload: { id: string; instructions: string } }
  | { type: 'CLEAR_CART' }
  | { type: 'TOGGLE_CART' }
  | { type: 'UPDATE_RESTAURANT_STATUS'; payload: { restaurantIsOpen: boolean; locationIsOpen?: boolean } };

type CartContextType = {
  state: CartState;
  addItem: (item: Omit<CartItem, 'id'>) => Promise<void>;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateInstructions: (id: string, instructions: string) => void;
  clearCart: () => void;
  toggleCart: () => void;
  subtotal: number;
  serviceFee: number;
  total: number;
  checkRestaurantStatus: () => Promise<{ restaurantIsOpen: boolean; locationIsOpen?: boolean }>;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.items.find(
        item => item.menuItemId === action.payload.menuItemId
      );

      if (existingItem) {
        return {
          ...state,
          items: state.items.map(item =>
            item.menuItemId === action.payload.menuItemId
              ? { ...item, quantity: item.quantity + action.payload.quantity }
              : item
          ),
        };
      }

      return {
        ...state,
        items: [...state.items, action.payload],
      };
    }

    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload),
      };

    case 'UPDATE_QUANTITY':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: action.payload.quantity }
            : item
        ),
      };

    case 'UPDATE_INSTRUCTIONS':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, specialInstructions: action.payload.instructions }
            : item
        ),
      };

    case 'CLEAR_CART':
      return {
        ...state,
        items: [],
      };

    case 'TOGGLE_CART':
      return {
        ...state,
        isOpen: !state.isOpen,
      };

    case 'UPDATE_RESTAURANT_STATUS':
      return {
        ...state,
        restaurantIsOpen: action.payload.restaurantIsOpen,
        locationIsOpen: action.payload.locationIsOpen || null,
        lastRestaurantCheck: Date.now(),
      };

    default:
      return state;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    isOpen: false,
    lastRestaurantCheck: null,
    restaurantIsOpen: null,
    locationIsOpen: null,
  });

  const checkRestaurantStatus = async (): Promise<{ restaurantIsOpen: boolean; locationIsOpen?: boolean }> => {
    if (state.items.length === 0) {
      return { restaurantIsOpen: true }; // Default to open if no items
    }

    const restaurantId = state.items[0].restaurantId;
    const locationId = state.items[0].locationId;

    try {
      if (locationId) {
        // Check location status
        const { data: location, errors } = await client.models.RestaurantLocation.get({
          id: locationId
        });
        
        if (errors) {
          console.error('Error fetching location status:', errors);
          return { restaurantIsOpen: true }; // Default to open on error
        }
        
        const locationIsOpen = (location as any)?.isOpen ?? false;
        dispatch({ 
          type: 'UPDATE_RESTAURANT_STATUS', 
          payload: { restaurantIsOpen: locationIsOpen, locationIsOpen } 
        });
        return { restaurantIsOpen: locationIsOpen, locationIsOpen };
      } else {
        // Check restaurant status
        const { data: restaurant, errors } = await client.models.Restaurant.get({
          id: restaurantId
        });
        
        if (errors) {
          console.error('Error fetching restaurant status:', errors);
          return { restaurantIsOpen: true }; // Default to open on error
        }
        
        const restaurantIsOpen = (restaurant as any)?.isOpen ?? false;
        dispatch({ 
          type: 'UPDATE_RESTAURANT_STATUS', 
          payload: { restaurantIsOpen } 
        });
        return { restaurantIsOpen };
      }
    } catch (error) {
      console.error('Error checking restaurant status:', error);
      return { restaurantIsOpen: true }; // Default to open on error
    }
  };

  const addItem = async (item: Omit<CartItem, 'id'>) => {
    const id = crypto.randomUUID();
    dispatch({ type: 'ADD_ITEM', payload: { ...item, id } });

    // Check if we need to verify restaurant status (if data is stale or we don't have it)
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
    const isStale = !state.lastRestaurantCheck || (now - state.lastRestaurantCheck) > fiveMinutes;

    if (isStale) {
      // Check restaurant status immediately and update the state
      try {
        await checkRestaurantStatus();
      } catch (error) {
        console.error('Error checking restaurant status:', error);
      }
    }
  };

  const removeItem = (id: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: id });
  };

  const updateQuantity = (id: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
  };

  const updateInstructions = (id: string, instructions: string) => {
    dispatch({ type: 'UPDATE_INSTRUCTIONS', payload: { id, instructions } });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const toggleCart = () => {
    dispatch({ type: 'TOGGLE_CART' });
  };

  const subtotal = state.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const serviceFee = PLATFORM_CONFIG.SERVICE_FEE;
  const total = subtotal + serviceFee;

  return (
    <CartContext.Provider
      value={{
        state,
        addItem,
        removeItem,
        updateQuantity,
        updateInstructions,
        clearCart,
        toggleCart,
        subtotal,
        serviceFee,
        total,
        checkRestaurantStatus,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
} 