import axios from "axios"
import { v4 as uuidv4 } from "uuid"
import { GRAPHQL_CONFIG, getGraphQLEndpoint } from "../config/graphql/api.js"

// Create axios instance for GraphQL
const graphqlClient = axios.create({
  baseURL: getGraphQLEndpoint(),
  timeout: GRAPHQL_CONFIG.REQUEST_CONFIG.timeout,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  },
})

// Request interceptor
graphqlClient.interceptors.request.use(
  config => {
    // Add timestamp to prevent caching
    const requestId = uuidv4()
    config.headers["X-Request-ID"] = requestId
    console.groupCollapsed(`Request: ${requestId}`)
    console.log("📝 Query:", config.data?.query?.replace(/\s+/g, " ").trim())
    console.log("📊 Variables:", config.data?.variables)
    console.groupEnd()
    return config
  },
  error => {
    console.error("❌ GraphQL Request Error:", error)
    return Promise.reject(error)
  },
)

// Response interceptor
graphqlClient.interceptors.response.use(
  response => {
    console.log(`✅ GraphQL Response: ${response.status}`)
    console.log(response)

    // Check for GraphQL errors
    if (response.data?.errors) {
      console.warn("⚠️ GraphQL Errors:", response.data.errors)
    }

    return response
  },
  error => {
    console.error("❌ GraphQL Response Error:", error.response?.status, error.message)

    // Handle different error types
    if (error.code === "ECONNABORTED") {
      error.message = "GraphQL request timeout. Please check your internet connection."
    } else if (error.response?.status === 429) {
      error.message = "Rate limit exceeded. Please try again later."
    } else if (error.response?.status >= 500) {
      error.message = "GraphQL server error. Please try again later."
    } else if (!error.response) {
      error.message = "Network error. Please check your internet connection."
    }

    return Promise.reject(error)
  },
)

// Retry mechanism for GraphQL requests
const retryGraphQLRequest = async (fn, retries = GRAPHQL_CONFIG.REQUEST_CONFIG.retries) => {
  try {
    return await fn()
  } catch (error) {
    if (retries > 0 && (error.response?.status >= 500 || !error.response)) {
      console.log(`🔄 Retrying GraphQL request... (${retries} attempts left)`)
      await new Promise(resolve => setTimeout(resolve, GRAPHQL_CONFIG.REQUEST_CONFIG.retryDelay))
      return retryGraphQLRequest(fn, retries - 1)
    }
    throw error
  }
}

// GraphQL service methods
export const graphqlService = {
  // Execute GraphQL query
  async query(query, variables = {}, operationName = null) {
    return retryGraphQLRequest(() =>
      graphqlClient.post("", {
        query,
        variables,
        ...(operationName && { operationName }),
      }),
    )
  },

  // Execute GraphQL mutation
  async mutate(mutation, variables = {}, operationName = null) {
    return retryGraphQLRequest(() =>
      graphqlClient.post("", {
        query: mutation,
        variables,
        ...(operationName && { operationName }),
      }),
    )
  },

  // Batch multiple GraphQL operations
  async batch(operations) {
    return retryGraphQLRequest(() => graphqlClient.post("", operations))
  },

  // Health check for GraphQL endpoint
  async healthCheck() {
    const healthQuery = `
      query HealthCheck {
        __schema {
          queryType {
            name
          }
        }
      }
    `

    try {
      const response = await this.query(healthQuery)
      return response.status === 200 && !response.data?.errors
    } catch (error) {
      console.error("GraphQL health check failed:", error.message)
      return false
    }
  },
}

export default graphqlService
