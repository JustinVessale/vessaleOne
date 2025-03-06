/**
 * Nash Delivery Service
 * 
 * This service handles all interactions with the Nash API for delivery orchestration.
 * Documentation: https://docs.usenash.com/api-reference/order/get-order-quotes
 */

// Nash API base URL - Use proxy in development, direct URL in production
const NASH_API_BASE_URL = import.meta.env.DEV 
  ? '/nash-api' 
  : 'https://api.sandbox.usenash.com';

// Nash API credentials - should be stored in environment variables
const NASH_API_KEY = import.meta.env.VITE_NASH_API_KEY || '';
const NASH_ORG_ID = import.meta.env.VITE_NASH_ORG_ID || '';
const NASH_DISPATCH_STRATEGY_ID = import.meta.env.VITE_NASH_DISPATCH_STRATEGY_ID || '';

// Log configuration on startup
console.log('Nash Service Configuration:');
console.log('- API credentials configured:', !!NASH_API_KEY && !!NASH_ORG_ID);
console.log('- Dispatch strategy configured:', !!NASH_DISPATCH_STRATEGY_ID);
console.log('- API base URL:', NASH_API_BASE_URL);

// Nash API endpoints
const ENDPOINTS = {
  CREATE_ORDER: '/v1/order',
  GET_ORDER: (orderId: string) => `/v1/order/${orderId}`,
  CANCEL_ORDER: (orderId: string) => `/v1/order/${orderId}/cancel`,
  REFRESH_QUOTES: '/v1/order/refresh_quotes',
  SELECT_QUOTE: (orderId: string) => `/v1/order/${orderId}/select_quote`,
  AUTODISPATCH: (orderId: string) => `/v1/order/${orderId}/autodispatch`,
};

// Types
export interface NashDeliveryAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
  instructions?: string;
}

export interface NashContact {
  name: string;
  phone: string;
  email?: string;
}

export interface NashDeliveryItem {
  name: string;
  quantity: number;
  price?: number;
}

// Updated types to match Nash API
export interface NashOrderRequest {
  // Pickup information
  pickupAddress: string;
  pickupPhoneNumber: string;
  pickupBusinessName?: string;
  pickupFirstName?: string;
  pickupLastName?: string;
  pickupInstructions?: string;
  
  // Dropoff information
  dropoffAddress: string;
  dropoffPhoneNumber: string;
  dropoffFirstName: string;
  dropoffLastName: string;
  dropoffInstructions?: string;
  dropoffEmail?: string;
  
  // Order details
  description?: string;
  itemsCount?: number;
  currency?: string;
  valueCents?: number;
  
  // Optional fields
  externalId?: string;
  deliveryMode?: 'now' | 'scheduled';
  items?: Array<{
    id: string;
    description: string;
    count: number;
    valueCents?: number;
  }>;
  
  // Dispatch strategy
  dispatchStrategyId?: string;
}

export interface NashQuote {
  id: string;
  providerId: string;
  providerName: string;
  providerLogo?: string;
  createdTime: string;
  expireTime: string;
  priceCents: number;
  nashFeeCents: number;
  currency: string;
  pickupWindow?: string;
  dropoffEta: string;
  tags?: string[];
  costSplitCustomerCents?: number;
  costSplitBusinessCents?: number;
}

export interface NashOrderResponse {
  id: string;
  status: string;
  externalId?: string;
  publicTrackingUrl?: string;
  pickupAddress: string;
  dropoffAddress: string;
  quotes?: NashQuote[];
  delivery?: {
    id: string;
    type: string;
    status: string;
  };
  winnerQuote?: {
    id: string;
    price_cents: number;
  };
}

export interface NashDeliveryResponse {
  id: string;
  status: string;
  trackingUrl: string;
  provider: string;
  fee: number;
  estimatedPickupTime: string;
  estimatedDeliveryTime: string;
  driver?: {
    name: string;
    phone: string;
    location?: {
      lat: number;
      lng: number;
    };
    photo_url?: string;
  };
}

/**
 * Makes an authenticated request to the Nash API
 */
async function nashRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any
): Promise<T> {
  // Check if API credentials are configured
  if (!NASH_API_KEY || !NASH_ORG_ID) {
    console.error('Nash API credentials not configured. Please set VITE_NASH_API_KEY and VITE_NASH_ORG_ID environment variables.');
    throw new Error('Nash API credentials not configured');
  }

  const url = `${NASH_API_BASE_URL}${endpoint}`;
  
  // Set up headers with proper authorization
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${NASH_API_KEY}`,
    'X-Nash-Org-ID': NASH_ORG_ID
  };
  
  // In development with proxy, we might need to adjust how headers are sent
  // This depends on how your proxy is configured
  if (import.meta.env.DEV) {
    console.log('Using development proxy with headers');
    // Some proxies might require different header formats or additional headers
    // If your proxy handles auth differently, adjust this section
  }

  const options: RequestInit = {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  };

  try {
    console.log(`Making ${method} request to Nash API: ${url}`);
    console.log('Request headers:', { 
      ...headers, 
      'Authorization': '[REDACTED]', 
      'X-Nash-Org-ID': '[REDACTED]' 
    });
    if (body) {
      console.log('Request body:', JSON.stringify(body, null, 2));
    }
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      let errorMessage = `Nash API error (${response.status}): ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = `Nash API error (${response.status}): ${errorData.message || response.statusText}`;
        console.error('Nash API error response:', errorData);
      } catch (parseError) {
        console.error('Could not parse error response:', parseError);
        try {
          const textResponse = await response.text();
          console.error('Raw error response:', textResponse);
        } catch (textError) {
          console.error('Could not get text response:', textError);
        }
      }
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    console.log('Nash API response:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('Nash API request failed:', error);
    throw error;
  }
}

/**
 * Helper function to format an address object into a string
 */
function formatAddress(address: NashDeliveryAddress): string {
  return `${address.street}, ${address.city}, ${address.state} ${address.zip}`;
}

/**
 * Helper function to format a contact name
 */
function formatContactName(contact: NashContact): { firstName: string, lastName: string } {
  const nameParts = contact.name.split(' ');
  const lastName = nameParts.length > 1 ? nameParts.pop() || '' : '';
  const firstName = nameParts.join(' ');
  return { firstName, lastName };
}

/**
 * Create an order with Nash to get delivery quotes
 */
export async function createOrderWithQuotes(
  request: {
    pickup: {
      address: NashDeliveryAddress;
      contact?: NashContact;
    };
    dropoff: {
      address: NashDeliveryAddress;
      contact: NashContact;
    };
    items?: NashDeliveryItem[];
    externalId?: string;
  }
): Promise<NashOrderResponse> {
  // Convert our internal request format to Nash API format
  const pickupAddress = formatAddress(request.pickup.address);
  const dropoffAddress = formatAddress(request.dropoff.address);
  
  let pickupFirstName = '';
  let pickupLastName = '';
  let pickupPhoneNumber = '';
  
  if (request.pickup.contact) {
    const { firstName, lastName } = formatContactName(request.pickup.contact);
    pickupFirstName = firstName;
    pickupLastName = lastName;
    pickupPhoneNumber = request.pickup.contact.phone;
  }
  
  const { firstName: dropoffFirstName, lastName: dropoffLastName } = formatContactName(request.dropoff.contact);
  
  // Calculate the total order value in cents
  const totalValueCents = request.items?.reduce((sum, item) => {
    // item.price is in dollars, so multiply by 100 to get cents
    const itemTotalCents = item.price ? Math.round(item.price * 100) * item.quantity : 0;
    return sum + itemTotalCents;
  }, 0) || 0;
  
  // Ensure we have a minimum value for valueCents (at least 100 cents = $1)
  const minValueCents = Math.max(totalValueCents, 100);
  
  const orderRequest: NashOrderRequest = {
    pickupAddress,
    pickupPhoneNumber: pickupPhoneNumber || '715-964-4470', // Fallback
    pickupBusinessName: request.pickup.contact?.name,
    pickupFirstName,
    pickupLastName,
    pickupInstructions: request.pickup.address.instructions || 'Pickup at the restaurant',
    
    dropoffAddress,
    dropoffPhoneNumber: request.dropoff.contact.phone,
    dropoffFirstName,
    dropoffLastName,
    dropoffInstructions: request.dropoff.address.instructions || 'Deliver to the customer',
    dropoffEmail: request.dropoff.contact.email,
    
    description: 'Food delivery',
    itemsCount: request.items?.reduce((sum, item) => sum + item.quantity, 0) || 1,
    currency: 'USD',
    deliveryMode: 'now',
    externalId: request.externalId,
    
    // Add dispatch strategy ID from environment variables
    dispatchStrategyId: NASH_DISPATCH_STRATEGY_ID,
    
    // Add the total order value in cents (required by Nash API)
    valueCents: minValueCents,
    
    // Convert items to Nash format if available
    items: request.items?.map((item, index) => ({
      id: `item-${index}`,
      description: item.name,
      count: item.quantity,
      valueCents: item.price ? Math.round(item.price * 100) : undefined
    }))
  };
  
  return nashRequest<NashOrderResponse>(
    ENDPOINTS.CREATE_ORDER,
    'POST',
    orderRequest
  );
}

/**
 * Refresh quotes for an existing order
 */
export async function refreshOrderQuotes(orderId: string): Promise<NashOrderResponse> {
  return nashRequest<NashOrderResponse>(
    ENDPOINTS.REFRESH_QUOTES,
    'POST',
    { orderId }
  );
}

/**
 * Select a quote for an order
 */
export async function selectQuote(
  orderId: string,
  quoteId: string
): Promise<NashOrderResponse> {
  return nashRequest<NashOrderResponse>(
    ENDPOINTS.SELECT_QUOTE(orderId),
    'POST',
    { quoteId }
  );
}

/**
 * Autodispatch an order to the selected provider
 */
export async function autodispatchOrder(
  orderId: string
): Promise<NashOrderResponse> {
  return nashRequest<NashOrderResponse>(
    ENDPOINTS.AUTODISPATCH(orderId),
    'POST'
  );
}

/**
 * Get order details from Nash
 */
export async function getOrder(
  orderId: string
): Promise<NashOrderResponse> {
  return nashRequest<NashOrderResponse>(
    ENDPOINTS.GET_ORDER(orderId),
    'GET'
  );
}

/**
 * Cancel an order with Nash
 */
export async function cancelOrder(
  orderId: string,
  reason?: string
): Promise<NashOrderResponse> {
  return nashRequest<NashOrderResponse>(
    ENDPOINTS.CANCEL_ORDER(orderId),
    'POST',
    { reason }
  );
} 