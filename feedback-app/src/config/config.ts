// API Configuration
const API_CONFIG = {
    development: {
        // Bilgisayar Wi-Fi IP adresini kullanıyoruz (ipconfig'den alındı)
        baseURL: 'http://172.20.10.2:5000/api',
    },
    production: {
        baseURL: 'https://your-production-api.com/api',
    }
};

// Get current environment
const isDevelopment = process.env.NODE_ENV === 'development';

// Export API URL based on environment
export const API_URL = isDevelopment ? API_CONFIG.development.baseURL : API_CONFIG.production.baseURL;

// Log configuration in development
if (isDevelopment) {
    console.log('API Configuration:', {
        environment: process.env.NODE_ENV,
        baseURL: API_URL,
    });
} 