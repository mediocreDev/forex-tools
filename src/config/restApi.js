// API Configuration
export const API_CONFIG = {
  // Base URLs for different environments
  BASE_URLS: {
    development: "https://api.exchangerate-api.com/v4",
    production: "https://api.exchangerate-api.com/v4",
    staging: "https://api.exchangerate-api.com/v4",
    mock: "https://mock-forex-api.example.com/v1", // For our fake API simulation
  },

  // Endpoints
  ENDPOINTS: {
    EXCHANGE_RATES: "/latest",
    HISTORICAL_RATES: "/history",
    CURRENCY_LIST: "/currencies",
    HEALTH_CHECK: "/status",
  },

  // Request configuration
  REQUEST_CONFIG: {
    timeout: 10000, // 10 seconds
    retries: 3,
    retryDelay: 1000, // 1 second
  },

  // Rate limiting
  RATE_LIMIT: {
    maxRequestsPerMinute: 60,
    cacheDuration: 60000, // 1 minute in milliseconds
  },

  // Supported currencies and pairs
  SUPPORTED_CURRENCIES: ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "NZD"],

  SUPPORTED_PAIRS: [
    "EUR/USD",
    "GBP/USD",
    "USD/JPY",
    "USD/CHF",
    "AUD/USD",
    "USD/CAD",
    "NZD/USD",
    "EUR/GBP",
    "EUR/JPY",
    "GBP/JPY",
  ],
}

// Get current environment
export const getCurrentEnvironment = () => {
  return import.meta.env.MODE || "development"
}

// Get base URL for current environment
export const getBaseUrl = () => {
  const env = getCurrentEnvironment()
  return API_CONFIG.BASE_URLS[env] || API_CONFIG.BASE_URLS.development
}

// Build full endpoint URL
export const buildEndpointUrl = (endpoint, params = {}) => {
  const baseUrl = getBaseUrl()
  let url = `${baseUrl}${endpoint}`

  // Add query parameters
  const queryParams = new URLSearchParams(params)
  if (queryParams.toString()) {
    url += `?${queryParams.toString()}`
  }

  return url
}
