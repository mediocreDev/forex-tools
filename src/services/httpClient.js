import axios from "axios"
import { API_CONFIG, getBaseUrl } from "../config/restApi.js"

// Create axios instance with default configuration
const httpClient = axios.create({
  baseURL: getBaseUrl(),
  timeout: API_CONFIG.REQUEST_CONFIG.timeout,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
})

// Request interceptor
httpClient.interceptors.request.use(
  (config) => {
    // Add timestamp to prevent caching
    config.params = {
      ...config.params,
      _t: Date.now(),
    }

    console.log(`🌐 HTTP Request: ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => {
    console.error("❌ Request Error:", error)
    return Promise.reject(error)
  },
)

// Response interceptor
httpClient.interceptors.response.use(
  (response) => {
    console.log(`✅ HTTP Response: ${response.status} ${response.config.url}`)
    return response
  },
  (error) => {
    console.error("❌ Response Error:", error.response?.status, error.message)

    // Handle different error types
    if (error.code === "ECONNABORTED") {
      error.message = "Request timeout. Please check your internet connection."
    } else if (error.response?.status === 429) {
      error.message = "Rate limit exceeded. Please try again later."
    } else if (error.response?.status >= 500) {
      error.message = "Server error. Please try again later."
    } else if (!error.response) {
      error.message = "Network error. Please check your internet connection."
    }

    return Promise.reject(error)
  },
)

// Retry mechanism
const retryRequest = async (fn, retries = API_CONFIG.REQUEST_CONFIG.retries) => {
  try {
    return await fn()
  } catch (error) {
    if (retries > 0 && error.response?.status >= 500) {
      console.log(`🔄 Retrying request... (${retries} attempts left)`)
      await new Promise((resolve) => setTimeout(resolve, API_CONFIG.REQUEST_CONFIG.retryDelay))
      return retryRequest(fn, retries - 1)
    }
    throw error
  }
}

// HTTP methods with retry
export const httpService = {
  async get(url, config = {}) {
    return retryRequest(() => httpClient.get(url, config))
  },

  async post(url, data, config = {}) {
    return retryRequest(() => httpClient.post(url, data, config))
  },

  async put(url, data, config = {}) {
    return retryRequest(() => httpClient.put(url, data, config))
  },

  async delete(url, config = {}) {
    return retryRequest(() => httpClient.delete(url, config))
  },

  async patch(url, data, config = {}) {
    return retryRequest(() => httpClient.patch(url, data, config))
  },
}

export default httpService
