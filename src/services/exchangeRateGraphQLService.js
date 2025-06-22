import dayjs from "dayjs"
import { graphqlService } from "./graphqlClient.js"
import {
  GET_TICK_PRICE,
  GET_CURRENCY_PAIR_RATE,
  GET_MULTIPLE_PAIRS,
} from "../config/graphql/queries.js"
import { LOG_CALCULATION } from "../config/graphql/mutations.js"
import { GRAPHQL_CONFIG } from "../config/graphql/api.js"

// GraphQL-based Exchange Rate Service
class ExchangeRateGraphQLService {
  constructor() {
    this.cache = new Map()
    this.lastRequestTime = 0
    this.requestCount = 0
    // Mock data for simulation when GraphQL endpoint is not available
    this.mockRates = {
      EUR_USD: 1.085,
      GBP_USD: 1.265,
      USD_JPY: 149.5,
      USD_CHF: 0.875,
      AUD_USD: 0.658,
      USD_CAD: 1.365,
      NZD_USD: 0.612,
      EUR_GBP: 0.858,
      EUR_JPY: 162.15,
      GBP_JPY: 189.05,
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

  // Simulate GraphQL API call (for development/demo purposes)
  async simulateGraphQLCall(query, variables) {
    console.log("🔮 Simulating GraphQL call...")
    console.log("Query:", query.replace(/\s+/g, " ").trim())
    console.log("Variables:", variables)

    // Simulate network delay
    const delay = Math.random() * 1500 + 500 // 500ms - 2s
    await new Promise(resolve => setTimeout(resolve, delay))

    // Simulate occasional API failures (5% chance)
    if (Math.random() < 0.05) {
      throw new Error("GraphQL server temporarily unavailable")
    }

    // Generate realistic exchange rates with small fluctuations
    const rates = []
    for (const [pair, baseRate] of Object.entries(this.mockRates)) {
      // Add ±0.3% random fluctuation
      const fluctuation = (Math.random() - 0.5) * 0.006
      const newRate = baseRate * (1 + fluctuation)

      rates.push({
        currency: pair.split("_")[1],
        rate: Math.round(newRate * 100000) / 100000,
        pair: pair,
        lastUpdated: new Date().toISOString(),
      })
    }

    return {
      data: {
        exchangeRates: {
          baseCurrency: variables.baseCurrency || "USD",
          timestamp: new Date().toISOString(),
          source: "Mock GraphQL Forex API",
          provider: "GraphQL Exchange Service",
          rates,
        },
      },
    }
  }

  // Fetch tick price using GraphQL
  async fetchTickPrice(quote) {
    try {
      console.log("🔮 Fetching tick price via GraphQL...")

      // Check rate limiting
      this.checkRateLimit()

      // Check cache first
      const cacheKey = `graphql_rates_${quote}`
      const cachedRates = this.getCachedRates(cacheKey)
      if (cachedRates) {
        return cachedRates
      }

      // Prepare GraphQL variables
      const variables = {
        askSymbolId: "fxcm:" + quote,
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

      console.log("✅ GraphQL exchange rates fetched successfully")
      return result
    } catch (error) {
      console.error("❌ Failed to fetch GraphQL exchange rates:", error.message)
      throw new Error(`Failed to fetch exchange rates via GraphQL: ${error.message}`)
    }
  }

  // Get specific currency pair rate using GraphQL
  async getCurrencyPairRate(pair, useRealAPI = false) {
    try {
      console.log(`🔮 Fetching ${pair} rate via GraphQL...`)

      const variables = { pair: pair.replace("/", "_") }

      let response
      if (useRealAPI) {
        response = await graphqlService.query(
          GET_CURRENCY_PAIR_RATE,
          variables,
          "GetCurrencyPairRate",
        )

        if (response.data?.errors) {
          throw new Error(`GraphQL errors: ${response.data.errors.map(e => e.message).join(", ")}`)
        }
      } else {
        // Simulate single pair query
        const mockResponse = {
          data: {
            currencyPair: {
              pair: pair.replace("/", "_"),
              rate: this.mockRates[pair.replace("/", "_")] || 1,
              bid: (this.mockRates[pair.replace("/", "_")] || 1) * 0.9999,
              ask: (this.mockRates[pair.replace("/", "_")] || 1) * 1.0001,
              spread: 0.0002,
              timestamp: new Date().toISOString(),
              source: "Mock GraphQL API",
              volatility: {
                daily: Math.random() * 0.02,
                weekly: Math.random() * 0.05,
                monthly: Math.random() * 0.1,
              },
            },
          },
        }
        response = { data: mockResponse }
      }

      const pairData = response.data?.data?.currencyPair
      if (!pairData) {
        throw new Error("Currency pair not found")
      }

      return {
        success: true,
        data: pairData,
        timestamp: pairData.timestamp,
        method: "GraphQL",
      }
    } catch (error) {
      console.error(`❌ Failed to fetch ${pair} rate via GraphQL:`, error.message)
      throw error
    }
  }

  // Get multiple currency pairs at once
  async getMultiplePairs(pairs, useRealAPI = false) {
    try {
      console.log("🔮 Fetching multiple pairs via GraphQL...")

      const variables = {
        pairs: pairs.map(pair => pair.replace("/", "_")),
      }

      let response
      if (useRealAPI) {
        response = await graphqlService.query(GET_MULTIPLE_PAIRS, variables, "GetMultiplePairs")

        if (response.data?.errors) {
          throw new Error(`GraphQL errors: ${response.data.errors.map(e => e.message).join(", ")}`)
        }
      } else {
        // Simulate multiple pairs query
        const mockPairs = pairs.map(pair => ({
          pair: pair.replace("/", "_"),
          rate: this.mockRates[pair.replace("/", "_")] || 1,
          bid: (this.mockRates[pair.replace("/", "_")] || 1) * 0.9999,
          ask: (this.mockRates[pair.replace("/", "_")] || 1) * 1.0001,
          spread: 0.0002,
          timestamp: new Date().toISOString(),
          change24h: (Math.random() - 0.5) * 0.02,
          changePercent24h: (Math.random() - 0.5) * 2,
        }))

        response = {
          data: {
            data: {
              multiplePairs: mockPairs,
            },
          },
        }
      }

      return {
        success: true,
        data: response.data?.data?.multiplePairs || [],
        timestamp: new Date().toISOString(),
        method: "GraphQL",
      }
    } catch (error) {
      console.error("❌ Failed to fetch multiple pairs via GraphQL:", error.message)
      throw error
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

  // Log calculation using GraphQL mutation
  async logCalculation(calculationType, parameters, result) {
    try {
      const variables = {
        input: {
          type: calculationType,
          parameters: JSON.stringify(parameters),
          result: JSON.stringify(result),
          timestamp: new Date().toISOString(),
        },
      }

      const response = await graphqlService.mutate(LOG_CALCULATION, variables, "LogCalculation")

      if (response.data?.errors) {
        console.warn("⚠️ Failed to log calculation:", response.data.errors)
        return false
      }

      console.log("📊 Calculation logged successfully")
      return true
    } catch (error) {
      console.warn("⚠️ Failed to log calculation:", error.message)
      return false
    }
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
export const exchangeRateGraphQLService = new ExchangeRateGraphQLService()
export default exchangeRateGraphQLService
