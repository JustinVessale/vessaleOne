/**
 * Nash Delivery Service
 * 
 * This service handles all interactions with the Nash API for delivery orchestration.
 * Documentation: https://docs.usenash.com/reference/nash-api-overview
 */

// Nash API base URL
const NASH_API_BASE_URL = 'https://api.usenash.com/v1';

// Nash API credentials - should be stored in environment variables
const NASH_API_KEY = import.meta.env.VITE_NASH_API_KEY || '';
const NASH_ORG_ID = import.meta.env.VITE_NASH_ORG_ID || '';

// Nash API endpoints
const ENDPOINTS = {
  CREATE_DELIVERY: '/deliveries',
  GET_DELIVERY: (deliveryId: string) => `/deliveries/${deliveryId}`,
  CANCEL_DELIVERY: (deliveryId: string) => `/deliveries/${deliveryId}/cancel`,
  GET_QUOTE: '/quotes',
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

export interface NashQuoteRequest {
  pickup: {
    address: NashDeliveryAddress;
    contact?: NashContact;
  };
  dropoff: {
    address: NashDeliveryAddress;
    contact: NashContact;
  };
  items?: NashDeliveryItem[];
}

export interface NashDeliveryRequest extends NashQuoteRequest {
  external_id?: string;
  pickup_ready_timestamp?: string; // ISO string
  dropoff_deadline_timestamp?: string; // ISO string
  tip_amount?: number;
  quote_id?: string;
}

export interface NashQuoteResponse {
  id: string;
  pickup: {
    address: NashDeliveryAddress;
    contact?: NashContact;
  };
  dropoff: {
    address: NashDeliveryAddress;
    contact: NashContact;
  };
  items?: NashDeliveryItem[];
  fee: number;
  currency: string;
  estimated_pickup_time: string; // ISO string
  estimated_dropoff_time: string; // ISO string
  estimated_pickup_distance: number;
  estimated_pickup_duration: number;
  estimated_dropoff_distance: number;
  estimated_dropoff_duration: number;
  provider: string;
}

export interface NashDeliveryResponse {
  id: string;
  external_id?: string;
  status: string;
  pickup: {
    address: NashDeliveryAddress;
    contact?: NashContact;
    ready_timestamp?: string;
    actual_timestamp?: string;
  };
  dropoff: {
    address: NashDeliveryAddress;
    contact: NashContact;
    deadline_timestamp?: string;
    actual_timestamp?: string;
  };
  items?: NashDeliveryItem[];
  fee: number;
  tip_amount?: number;
  currency: string;
  estimated_pickup_time: string;
  estimated_dropoff_time: string;
  tracking_url: string;
  provider: string;
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
  if (!NASH_API_KEY || !NASH_ORG_ID) {
    throw new Error('Nash API credentials not configured');
  }

  const url = `${NASH_API_BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    'X-Nash-API-Key': NASH_API_KEY,
    'X-Nash-Org-ID': NASH_ORG_ID,
  };

  const options: RequestInit = {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  };

  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Nash API error (${response.status}): ${
          errorData.message || response.statusText
        }`
      );
    }
    
    return await response.json();
  } catch (error) {
    console.error('Nash API request failed:', error);
    throw error;
  }
}

/**
 * Get a delivery quote from Nash
 */
export async function getDeliveryQuote(
  quoteRequest: NashQuoteRequest
): Promise<NashQuoteResponse> {
  return nashRequest<NashQuoteResponse>(
    ENDPOINTS.GET_QUOTE,
    'POST',
    quoteRequest
  );
}

/**
 * Create a delivery with Nash
 */
export async function createDelivery(
  deliveryRequest: NashDeliveryRequest
): Promise<NashDeliveryResponse> {
  return nashRequest<NashDeliveryResponse>(
    ENDPOINTS.CREATE_DELIVERY,
    'POST',
    deliveryRequest
  );
}

/**
 * Get delivery details from Nash
 */
export async function getDelivery(
  deliveryId: string
): Promise<NashDeliveryResponse> {
  return nashRequest<NashDeliveryResponse>(
    ENDPOINTS.GET_DELIVERY(deliveryId),
    'GET'
  );
}

/**
 * Cancel a delivery with Nash
 */
export async function cancelDelivery(
  deliveryId: string,
  reason?: string
): Promise<NashDeliveryResponse> {
  return nashRequest<NashDeliveryResponse>(
    ENDPOINTS.CANCEL_DELIVERY(deliveryId),
    'POST',
    { reason }
  );
} 