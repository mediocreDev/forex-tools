import { httpService } from "./httpClient.js"
import { API_CONFIG, buildEndpointUrl } from "../config/restApi.js"

// Simulate a fake REST API for exchange rates
class ExchangeRateService {
  constructor() {
    this.cache = new Map()
    this.lastRequestTime = 0
    this.requestCount = 0
    // Base rates for simulation (these would come from a real API)
    this.baseRates = {
      "EUR/USD": 1.085,
      "GBP/USD": 1.265,
      "USD/JPY": 149.5,
      "USD/CHF": 0.875,
      "AUD/USD": 0.658,
      "USD/CAD": 1.365,
      "NZD/USD": 0.612,
      "EUR/GBP": 0.858,
      "EUR/JPY": 162.15,
      "GBP/JPY": 189.05,
    }
  }

  // Check rate limiting
  checkRateLimit() {
    const now = Date.now()
    const oneMinute = 60000

    // Reset counter if more than a minute has passed
    if (now - this.lastRequestTime > oneMinute) {
      this.requestCount = 0
      this.lastRequestTime = now
    }

    if (this.requestCount >= API_CONFIG.RATE_LIMIT.maxRequestsPerMinute) {
      throw new Error("Rate limit exceeded. Please wait before making another request.")
    }

    this.requestCount++
  }

  // Check cache
  getCachedRates(cacheKey) {
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < API_CONFIG.RATE_LIMIT.cacheDuration) {
      console.log("📦 Using cached exchange rates")
      return cached.data
    }
    return null
  }

  // Cache rates
  setCachedRates(cacheKey, data) {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    })
  }

  // Simulate real API call (for development/demo purposes)
  async simulateApiCall() {
    // Simulate network delay
    const delay = Math.random() * 1500 + 500 // 500ms - 2s
    await new Promise(resolve => setTimeout(resolve, delay))

    // Simulate occasional API failures (5% chance)
    if (Math.random() < 0.05) {
      throw new Error("External API temporarily unavailable")
    }

    // Generate realistic exchange rates with small fluctuations
    const baseRates = {
      "EUR/USD": 1.085,
      "GBP/USD": 1.265,
      "USD/JPY": 149.5,
      "USD/CHF": 0.875,
      "AUD/USD": 0.658,
      "USD/CAD": 1.365,
      "NZD/USD": 0.612,
      "EUR/GBP": 0.858,
      "EUR/JPY": 162.15,
      "GBP/JPY": 189.05,
    }

    const rates = {}
    for (const [pair, baseRate] of Object.entries(baseRates)) {
      // Add ±0.3% random fluctuation
      const fluctuation = (Math.random() - 0.5) * 0.006
      const newRate = baseRate * (1 + fluctuation)
      rates[pair] = Math.round(newRate * 100000) / 100000
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
      base: "USD",
      rates,
      source: "Mock Forex API v2.0",
      provider: "ExchangeRate-API",
    }
  }

  // Fetch exchange rates from real API (commented out for demo)
  async fetchFromRealAPI(baseCurrency = "USD") {
    try {
      const url = buildEndpointUrl(API_CONFIG.ENDPOINTS.EXCHANGE_RATES, {
        base: baseCurrency,
        symbols: API_CONFIG.SUPPORTED_CURRENCIES.join(","),
      })

      const response = await httpService.get(url)

      return {
        success: true,
        timestamp: response.data.date || new Date().toISOString(),
        base: response.data.base,
        rates: response.data.rates,
        source: "ExchangeRate-API",
        provider: "Real API",
      }
    } catch (error) {
      console.error("Real API failed, falling back to simulation:", error.message)
      // Fallback to simulation if real API fails
      return this.simulateApiCall()
    }
  }

  // Main method to fetch exchange rates
  async fetchExchangeRates(baseCurrency = "USD", useRealAPI = false) {
    try {
      console.log("🌐 Fetching exchange rates...")

      // Check rate limiting
      this.checkRateLimit()

      // Check cache first
      const cacheKey = `rates_${baseCurrency}`
      const cachedRates = this.getCachedRates(cacheKey)
      if (cachedRates) {
        return cachedRates
      }

      // Fetch from API
      let apiResponse
      if (useRealAPI) {
        apiResponse = await this.fetchFromRealAPI(baseCurrency)
      } else {
        // Use simulation for demo purposes
        apiResponse = await this.simulateApiCall()
      }

      // Transform rates to our expected format
      const transformedRates = this.transformRates(apiResponse.rates, baseCurrency)

      const result = {
        success: true,
        data: transformedRates,
        timestamp: apiResponse.timestamp,
        source: apiResponse.source,
        provider: apiResponse.provider,
        cached: false,
      }

      // Cache the result
      this.setCachedRates(cacheKey, result)

      console.log("✅ Exchange rates fetched successfully")
      return result
    } catch (error) {
      console.error("❌ Failed to fetch exchange rates:", error.message)
      throw new Error(`Failed to fetch exchange rates: ${error.message}`)
    }
  }

  // Transform API rates to our currency pair format
  transformRates(rates, baseCurrency) {
    const transformedRates = {}

    // Convert single currency rates to currency pairs
    for (const currency of API_CONFIG.SUPPORTED_CURRENCIES) {
      if (currency === baseCurrency) continue

      const pair = `${baseCurrency}/${currency}`
      const inversePair = `${currency}/${baseCurrency}`

      if (rates[currency]) {
        transformedRates[pair] = rates[currency]
        transformedRates[inversePair] = 1 / rates[currency]
      }
    }

    // Add cross-currency pairs
    if (rates.EUR && rates.GBP) {
      transformedRates["EUR/GBP"] = rates.GBP / rates.EUR
      transformedRates["GBP/EUR"] = rates.EUR / rates.GBP
    }

    if (rates.EUR && rates.JPY) {
      transformedRates["EUR/JPY"] = rates.JPY / rates.EUR
      transformedRates["JPY/EUR"] = rates.EUR / rates.JPY
    }

    if (rates.GBP && rates.JPY) {
      transformedRates["GBP/JPY"] = rates.JPY / rates.GBP
      transformedRates["JPY/GBP"] = rates.GBP / rates.JPY
    }

    return transformedRates
  }

  // Get specific rate for a currency pair
  async getRate(currencyPair, useRealAPI = false) {
    try {
      const response = await this.fetchExchangeRates("USD", useRealAPI)
      return response.data[currencyPair] || 1
    } catch (error) {
      console.error(`Failed to get rate for ${currencyPair}:`, error.message)
      return 1 // Fallback rate
    }
  }

  // Health check
  async healthCheck() {
    try {
      const url = buildEndpointUrl(API_CONFIG.ENDPOINTS.HEALTH_CHECK)
      const response = await httpService.get(url)
      return response.status === 200
    } catch (error) {
      console.error("Health check failed:", error.message)
      return false
    }
  }

  // Clear cache
  clearCache() {
    this.cache.clear()
    console.log("🗑️ Exchange rate cache cleared")
  }

  // Get cache stats
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
      requestCount: this.requestCount,
      lastRequestTime: this.lastRequestTime,
    }
  }
}

// Export singleton instance
export const exchangeRateService = new ExchangeRateService()
export default exchangeRateService
