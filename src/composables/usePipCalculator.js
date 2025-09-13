import { reactive, ref } from "vue"
import { tickPriceService } from "../services/tickPriceService.js"
import { getPipValuePerStandardLot } from "../utils/calculations.js"
import { findCurrencyPairEnum, findCurrencyPairEnumByValue } from "../utils/helpers.js"

export function usePipCalculator() {
  // Form data - completely separate
  const formData = reactive({
    currencyPair: "EURUSD",
    standardLotSize: 0.01,
    accountCurrency: "USD",
  })

  // Results - completely isolated, no initial calculation
  const hasCalculated = ref(false)
  const calculatedResults = ref(null)
  const isLoading = ref(false)
  const error = ref(null)

  const calculate = async () => {
    console.log("🧮 CALCULATE FUNCTION CALLED!")

    // Validate inputs before calculation
    if (!formData.currencyPair || !formData.standardLotSize || !formData.accountCurrency) {
      error.value = "All fields are required for calculation"
      return
    }

    if (formData.askPrice <= 0) {
      error.value = "Ask price must be greater than 0"
      return
    }

    if (formData.standardLotSize <= 0) {
      error.value = "Position size must be greater than 0"
      return
    }

    // Reset states
    isLoading.value = true
    error.value = null

    try {
      // Take a complete snapshot to break any reactive links
      const snapshot = JSON.parse(
        JSON.stringify({
          currencyPair: formData.currencyPair,
          standardLotSize: formData.standardLotSize,
          accountCurrency: formData.accountCurrency,
        }),
      )
      console.log("📸 Snapshot taken:", snapshot)

      const currencyPairEnum = findCurrencyPairEnum(formData.currencyPair)
      let accountCurrencyWeight = 1
      if (currencyPairEnum.quote !== "USD") {
        const accountCurrencyWeightPairEnum = findCurrencyPairEnumByValue(
          currencyPairEnum.quote,
          formData.accountCurrency,
        )
        const accountCurrencyWeightPairTickPrice = await tickPriceService.fetchTickPrice(
          accountCurrencyWeightPairEnum,
        )
        if (
          accountCurrencyWeightPairEnum["value"] ===
          `${currencyPairEnum.quote}${formData.accountCurrency}`
        ) {
          accountCurrencyWeight = accountCurrencyWeightPairTickPrice.askPrice
        } else {
          accountCurrencyWeight = 1 / accountCurrencyWeightPairTickPrice.askPrice
        }
      }

      // Fetch tick price using GraphQL service
      console.log("🔮 Fetching tick price via GraphQL service...")
      const tickPriceResponse = await tickPriceService.fetchTickPrice(currencyPairEnum)
      console.log("💱 GraphQL tick price received:", tickPriceResponse.askPrice)

      // Perform calculations with live rates
      const pipValuePerStandardLot = getPipValuePerStandardLot(
        currencyPairEnum,
        accountCurrencyWeight,
      )

      const newResults = {
        formSnapshot: snapshot,
        exchangeRateInfo: {
          timestamp: tickPriceResponse.timestamp,
          source: tickPriceResponse.source,
          provider: tickPriceResponse.provider,
          cached: tickPriceResponse.cached,
          currentRate: tickPriceResponse.askPrice,
        },
        results: {
          pipValue: pipValuePerStandardLot * formData.standardLotSize,
        },
      }

      console.log("✅ Calculation complete:", newResults)

      // Set results
      calculatedResults.value = newResults
      hasCalculated.value = true
    } catch (err) {
      console.error("❌ Calculation error:", err)
      error.value = err.message || "Failed to calculate pip value. Please try again."
    } finally {
      isLoading.value = false
    }
  }

  return {
    formData,
    hasCalculated,
    calculatedResults,
    isLoading,
    error,
    calculate,
  }
}
