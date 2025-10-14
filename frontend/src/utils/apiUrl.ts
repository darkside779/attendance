/**
 * Utility to get the correct API base URL based on the current hostname
 * This allows the app to work from any device on the network
 */
export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // If accessing via IP address, use that IP for API calls
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `http://${hostname}:8001/api/v1`;
    }
  }
  // Default to localhost for development
  return 'http://127.0.0.1:8001/api/v1';
};

/**
 * Get the API base URL without the /api/v1 suffix
 */
export const getApiHost = (): string => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `http://${hostname}:8001`;
    }
  }
  return 'http://127.0.0.1:8001';
};
