import dayjs from "dayjs"
import axios from "axios"

const ONE_MINUTE = 60000
const CACHE_DURATION = ONE_MINUTE
const MAX_REQUESTS_PER_MINUTE = 60
const FETCH_TIMEOUT = 15000
const HEALTH_CHECK_TIMEOUT = 10000

// Exchange Rate Service
class TickPriceService {
  constructor() {
    this.cache = new Map()
    this.lastRequestTime = 0
    this.requestCount = 0
  }

  checkRateLimit() {
    const now = Date.now()
    if (now - this.lastRequestTime > ONE_MINUTE) {
      this.requestCount = 0
      this.lastRequestTime = now
    }
    if (this.requestCount >= MAX_REQUESTS_PER_MINUTE) {
      throw new Error("Rate limit exceeded. Please wait before making another request.")
    }
    this.requestCount++
  }

  getCachedRates(cacheKey) {
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log("Using cached exchange rates")
      return cached.data
    }
    return null
  }

  setCachedRates(cacheKey, data) {
    this.cache.set(cacheKey, { data, timestamp: Date.now() })
  }

  async fetchTickPrice(currencyPair) {
    try {
      console.log("Fetching tick price...")

      this.checkRateLimit()

      const cacheKey = `rates_${currencyPair.value}`
      const cachedRates = this.getCachedRates(cacheKey)
      if (cachedRates) {
        return cachedRates
      }

      const response = await axios.get(`/api/price/${currencyPair.value}`, {
        timeout: FETCH_TIMEOUT,
      })

      const { price, source, pair } = response.data
      if (typeof price !== "number" || isNaN(price)) {
        throw new Error("Invalid price response")
      }

      const result = {
        success: true,
        askPrice: price,
        timestamp: dayjs().toISOString(),
        source,
        pair,
        cached: false,
      }

      this.setCachedRates(cacheKey, result)

      console.log("Tick price fetched successfully", result)
      return result
    } catch (error) {
      console.error("Failed to fetch tick price:", error.message)
      throw new Error(`Failed to fetch exchange rates: ${error.message}`)
    }
  }

  async healthCheck() {
    try {
      const response = await axios.get("/api/price/EURUSD", { timeout: HEALTH_CHECK_TIMEOUT })
      return response.status === 200 && response.data?.price != null
    } catch (error) {
      console.error("Health check failed:", error.message)
      return false
    }
  }

  clearCache() {
    this.cache.clear()
    console.log("Exchange rate cache cleared")
  }

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
