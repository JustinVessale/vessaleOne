import { useToast } from '@/hooks/use-toast';

/**
 * Predefined error messages for common scenarios
 */
export const ErrorMessages = {
  DELIVERY: {
    QUOTE_SELECTION_FAILED: 'Could not select delivery option. Please try again or switch to pickup.',
    QUOTES_FETCH_FAILED: 'Failed to get delivery options. Please try again or switch to pickup.',
    DELIVERY_SETUP_FAILED: 'Unable to set up delivery. Please try again or contact support.',
  },
  PAYMENT: {
    PROCESSING_FAILED: 'Payment processing failed. Please try again with a different payment method.',
    VALIDATION_FAILED: 'Please check your payment information and try again.',
  },
  ORDER: {
    CREATION_FAILED: 'Failed to create your order. Please try again.',
    FETCH_FAILED: 'Could not retrieve order information. Please try again.',
  },
  GENERAL: {
    NETWORK_ERROR: 'Network connection issue. Please check your internet connection and try again.',
    SERVER_ERROR: 'Server error. Our team has been notified and is working on a fix.',
    UNEXPECTED_ERROR: 'An unexpected error occurred. Please try again or contact support.',
  }
};

/**
 * Custom hook for handling errors with toast notifications
 */
export function useErrorHandler() {
  const { toast } = useToast();
  
  /**
   * Show an error toast with a consistent format
   */
  const showErrorToast = (message: string) => {
    toast({
      title: 'Error',
      description: message,
      variant: 'destructive',
    });
  };
  
  /**
   * Handle API errors with consistent error messaging
   */
  const handleApiError = (error: unknown, fallbackMessage?: string) => {
    console.error('API Error:', error);
    
    const defaultMessage = fallbackMessage || ErrorMessages.GENERAL.UNEXPECTED_ERROR;
    
    let errorMessage = defaultMessage;
    
    // Extract error message if available
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = String((error as { message: unknown }).message);
    }
    
    showErrorToast(errorMessage);
  };
  
  return {
    showErrorToast,
    handleApiError,
  };
} 