// Configuration constants
// Using the same IP address as mobile app for consistency
export const API_URL = process.env.NODE_ENV === 'development'
    ? 'http://localhost:5000/api'         // For local development
    : 'http://172.20.10.2:5000/api';      // For production/testing

// Application information
export const APP_NAME = 'Geri Bildirim';
export const APP_VERSION = '1.0.0';

// Export empty object to make this a module
export { }; 