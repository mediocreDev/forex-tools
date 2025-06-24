import dayjs from "dayjs"
import { graphqlService } from "./graphqlClient.js"
import { GET_TICK_PRICE } from "../config/graphql/queries.js"
import { GRAPHQL_CONFIG } from "../config/graphql/api.js"

// GraphQL-based Exchange Rate Service
class TickPriceService {
  constructor() {
    this.cache = new Map()
    this.lastRequestTime = 0
    this.requestCount = 0
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

    if (this.requestCount >= GRAPHQL_CONFIG.RATE_LIMIT.maxRequestsPerMinute) {
      throw new Error("Rate limit exceeded. Please wait before making another request.")
    }

    this.requestCount++
  }

  // Check cache
  getCachedRates(cacheKey) {
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < GRAPHQL_CONFIG.RATE_LIMIT.cacheDuration) {
      console.log("📦 Using cached GraphQL exchange rates")
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

  // Fetch tick price using GraphQL
  async fetchTickPrice(currencyPair) {
    try {
      console.log("🔮 Fetching tick price via GraphQL...")

      // Check rate limiting
      this.checkRateLimit()

      // Check cache first
      const cacheKey = `graphql_rates_${currencyPair.value}`
      const cachedRates = this.getCachedRates(cacheKey)
      if (cachedRates) {
        return cachedRates
      }

      // Prepare GraphQL variables
      const variables = {
        askSymbolId: `${currencyPair.broker}:${currencyPair.value}`,
      }

      const response = await graphqlService.query(GET_TICK_PRICE, variables)

      // Check for GraphQL errors
      if (response.data?.errors) {
        throw new Error(`GraphQL errors: ${response.data.errors.map(e => e.message).join(", ")}`)
      }

      // Transform GraphQL response to our expected format
      const askPriceData = response.data?.data?.ask
      if (!askPriceData) {
        throw new Error("Invalid GraphQL response structure")
      }

      // const transformedRates = this.transformGraphQLRates(askPriceData.rates, baseCurrency)

      const result = {
        success: true,
        askPrice: askPriceData.price,
        timestamp: dayjs().toISOString(),
        broker: askPriceData.broker.name,
        cached: false,
        method: "GraphQL",
      }

      // Cache the result
      this.setCachedRates(cacheKey, result)

      console.log("✅ GraphQL exchange rates fetched successfully", result)
      return result
    } catch (error) {
      console.error("❌ Failed to fetch GraphQL exchange rates:", error.message)
      throw new Error(`Failed to fetch exchange rates via GraphQL: ${error.message}`)
    }
  }

  // Transform GraphQL rates to our currency pair format
  transformGraphQLRates(rates, baseCurrency) {
    const transformedRates = {}

    // Convert GraphQL rates to currency pairs
    rates.forEach(rate => {
      const pair = `${baseCurrency}/${rate.currency}`
      const inversePair = `${rate.currency}/${baseCurrency}`

      transformedRates[pair] = rate.rate
      transformedRates[inversePair] = 1 / rate.rate
    })

    // Add cross-currency pairs (simplified)
    if (transformedRates["USD/EUR"] && transformedRates["USD/GBP"]) {
      transformedRates["EUR/GBP"] = transformedRates["USD/GBP"] / transformedRates["USD/EUR"]
      transformedRates["GBP/EUR"] = transformedRates["USD/EUR"] / transformedRates["USD/GBP"]
    }

    if (transformedRates["USD/EUR"] && transformedRates["USD/JPY"]) {
      transformedRates["EUR/JPY"] = transformedRates["USD/JPY"] / transformedRates["USD/EUR"]
      transformedRates["JPY/EUR"] = transformedRates["USD/EUR"] / transformedRates["USD/JPY"]
    }

    if (transformedRates["USD/GBP"] && transformedRates["USD/JPY"]) {
      transformedRates["GBP/JPY"] = transformedRates["USD/JPY"] / transformedRates["USD/GBP"]
      transformedRates["JPY/GBP"] = transformedRates["USD/GBP"] / transformedRates["USD/JPY"]
    }

    return transformedRates
  }

  // Health check
  async healthCheck() {
    try {
      return await graphqlService.healthCheck()
    } catch (error) {
      console.error("GraphQL health check failed:", error.message)
      return false
    }
  }

  // Clear cache
  clearCache() {
    this.cache.clear()
    console.log("🗑️ GraphQL exchange rate cache cleared")
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
export const tickPriceService = new TickPriceService()
export default tickPriceService
