/**
 * Nash Delivery Service
 * 
 * This service handles all interactions with the Nash API for delivery orchestration.
 * Documentation: https://docs.usenash.com/reference/nash-api-overview
 */

// Nash API base URL - Use local proxy in development to avoid CORS issues
const NASH_API_BASE_URL = import.meta.env.DEV 
  ? '/nash-api' 
  : 'https://api.usenash.com/v1';

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
  
  // Only include API credentials in headers when not using the proxy
  // When using the proxy, the credentials are added by the proxy
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Add API credentials to headers only when not in development
  if (!import.meta.env.DEV) {
    headers['X-Nash-API-Key'] = NASH_API_KEY;
    headers['X-Nash-Org-ID'] = NASH_ORG_ID;
  }

  const options: RequestInit = {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  };

  try {
    console.log(`Making ${method} request to Nash API: ${url}`);
    console.log('Request headers:', headers);
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