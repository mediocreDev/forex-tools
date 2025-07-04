// GraphQL Configuration
export const GRAPHQL_CONFIG = {

  // Request configuration
  REQUEST_CONFIG: {
    timeout: 15000, // 15 seconds for GraphQL queries
    retries: 3,
    retryDelay: 1000, // 1 second
  },

  // Rate limiting
  RATE_LIMIT: {
    maxRequestsPerMinute: 60,
    cacheDuration: 60000, // 1 minute in milliseconds
  },

  // GraphQL operation types
  OPERATION_TYPES: {
    QUERY: "query",
    MUTATION: "mutation",
    SUBSCRIPTION: "subscription",
  },

  // Supported currencies and pairs
  SUPPORTED_CURRENCIES: ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "NZD"],

  SUPPORTED_PAIRS: [
    "EUR_USD",
    "GBP_USD",
    "USD_JPY",
    "USD_CHF",
    "AUD_USD",
    "USD_CAD",
    "NZD_USD",
    "EUR_GBP",
    "EUR_JPY",
    "GBP_JPY",
  ],
}

// Get current environment
export const getCurrentEnvironment = () => {
  return import.meta.env.VITE_API_ENV || "dev"
}

// Get GraphQL endpoint for current environment
export const getGraphQLEndpoint = () => {
  const env = getCurrentEnvironment()
  const host = import.meta.env.VITE_API_HOST || "http://test.com"
  const port = import.meta.env.VITE_API_PORT || "3333"
  return `${host}:${port}/api`
}

// Build GraphQL request payload
export const buildGraphQLRequest = (query, variables = {}, operationName = null) => {
  return {
    query,
    variables,
    ...(operationName && { operationName }),
  }
}
