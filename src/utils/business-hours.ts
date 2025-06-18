import { toZonedTime, format } from 'date-fns-tz';

export interface BusinessHours {
  id: string;
  restaurantId: string;
  locationId?: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  isOpen: boolean;
  openTime: string; // Format: "HH:MM" (24-hour)
  closeTime: string; // Format: "HH:MM" (24-hour)
}

export interface RestaurantHours {
  timezone: string;
  businessHours: BusinessHours[];
}

/**
 * Common timezone options for restaurant owners to select from
 */
export const TIMEZONE_OPTIONS = [
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'America/Toronto', label: 'Eastern Time - Toronto' },
  { value: 'America/Vancouver', label: 'Pacific Time - Vancouver' },
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' },
];

/**
 * Day of week labels
 */
export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday', 
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

/**
 * Get the current day of week (0-6) in the restaurant's timezone
 */
export function getCurrentDayOfWeek(timezone: string): number {
  const now = new Date();
  const zonedTime = toZonedTime(now, timezone);
  return zonedTime.getDay();
}

/**
 * Get the current time in the restaurant's timezone
 */
export function getCurrentTime(timezone: string): string {
  const now = new Date();
  const zonedTime = toZonedTime(now, timezone);
  return format(zonedTime, 'HH:mm', { timeZone: timezone });
}

/**
 * Check if a restaurant is currently open based on its business hours
 */
export function isRestaurantOpen(restaurantHours: RestaurantHours): boolean {
  const { timezone, businessHours } = restaurantHours;
  
  if (!businessHours || businessHours.length === 0) {
    return false; // No hours set, consider closed
  }

  const currentDayOfWeek = getCurrentDayOfWeek(timezone);
  const currentTime = getCurrentTime(timezone);
  
  // Find today's hours
  const todayHours = businessHours.find(hours => hours.dayOfWeek === currentDayOfWeek);
  
  if (!todayHours || !todayHours.isOpen) {
    return false; // Closed today
  }

  // Check if current time is within open hours
  return isTimeInRange(currentTime, todayHours.openTime, todayHours.closeTime);
}

/**
 * Check if a restaurant is currently open (with BusinessHours array input)
 */
export function isRestaurantOpenFromHours(timezone: string, businessHours: BusinessHours[]): boolean {
  return isRestaurantOpen({ timezone, businessHours });
}

/**
 * Check if a given time is within a time range
 */
export function isTimeInRange(currentTime: string, openTime: string, closeTime: string): boolean {
  // Handle overnight hours (e.g., 22:00 - 02:00)
  if (closeTime < openTime) {
    // Restaurant closes after midnight
    return currentTime >= openTime || currentTime <= closeTime;
  } else {
    // Restaurant closes before midnight
    return currentTime >= openTime && currentTime <= closeTime;
  }
}

/**
 * Get the next opening time for a restaurant
 */
export function getNextOpeningTime(restaurantHours: RestaurantHours): { day: string; time: string } | null {
  const { timezone, businessHours } = restaurantHours;
  
  if (!businessHours || businessHours.length === 0) {
    return null;
  }

  const currentDayOfWeek = getCurrentDayOfWeek(timezone);
  const currentTime = getCurrentTime(timezone);
  
  // Check remaining days in the week
  for (let i = 0; i < 7; i++) {
    const checkDay = (currentDayOfWeek + i) % 7;
    const dayHours = businessHours.find(hours => hours.dayOfWeek === checkDay);
    
    if (dayHours && dayHours.isOpen) {
      if (i === 0) {
        // Same day - check if we're before opening time
        if (currentTime < dayHours.openTime) {
          return {
            day: DAYS_OF_WEEK[checkDay],
            time: dayHours.openTime
          };
        }
      } else {
        // Different day
        return {
          day: DAYS_OF_WEEK[checkDay],
          time: dayHours.openTime
        };
      }
    }
  }
  
  return null;
}

/**
 * Get the next opening time for a restaurant (with BusinessHours array input)
 */
export function getNextOpeningTimeFromHours(timezone: string, businessHours: BusinessHours[]): { day: string; time: string } | null {
  return getNextOpeningTime({ timezone, businessHours });
}

/**
 * Create default business hours (11AM - 9PM for all days)
 */
export function createDefaultBusinessHours(restaurantId: string, locationId?: string): Omit<BusinessHours, 'id'>[] {
  return DAYS_OF_WEEK.map((_, index) => ({
    restaurantId,
    locationId,
    dayOfWeek: index,
    isOpen: true,
    openTime: '11:00',
    closeTime: '21:00'
  }));
}

/**
 * Format time for display (12-hour format)
 */
export function formatTimeForDisplay(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

/**
 * Parse time from display format to 24-hour format
 */
export function parseTimeFromDisplay(displayTime: string): string {
  const [time, ampm] = displayTime.split(' ');
  const [hours, minutes] = time.split(':');
  let hour = parseInt(hours);
  
  if (ampm === 'PM' && hour !== 12) {
    hour += 12;
  } else if (ampm === 'AM' && hour === 12) {
    hour = 0;
  }
  
  return `${hour.toString().padStart(2, '0')}:${minutes}`;
}

/**
 * Get a human-readable status message for restaurant hours
 */
export function getRestaurantStatusMessage(restaurantHours: RestaurantHours): {
  isOpen: boolean;
  message: string;
  nextOpening?: { day: string; time: string };
} {
  const isOpen = isRestaurantOpen(restaurantHours);
  
  if (isOpen) {
    return {
      isOpen: true,
      message: 'Open now'
    };
  }
  
  const nextOpening = getNextOpeningTime(restaurantHours);
  
  if (nextOpening) {
    return {
      isOpen: false,
      message: `Closed • Opens ${nextOpening.day} at ${formatTimeForDisplay(nextOpening.time)}`,
      nextOpening
    };
  }
  
  return {
    isOpen: false,
    message: 'Currently closed'
  };
}

/**
 * Get a human-readable status message for restaurant hours (with BusinessHours array input)
 */
export function getRestaurantStatusMessageFromHours(timezone: string, businessHours: BusinessHours[]): {
  isOpen: boolean;
  message: string;
  nextOpening?: { day: string; time: string };
} {
  return getRestaurantStatusMessage({ timezone, businessHours });
} 