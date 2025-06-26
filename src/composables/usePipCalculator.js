import { reactive, ref } from "vue"
import { tickPriceService } from "../services/tickPriceService.js"
import {
  calculateDrawdown,
  calculatePositionSize,
  calculateRiskReward,
} from "../utils/calculations.js"
import { findCurrencyPairEnum } from "../utils/helpers.js"

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
    console.log("🔥 CALCULATE FUNCTION CALLED!")
    console.log("Current form data:", JSON.stringify(formData, null, 2))

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
      const tickPrice = tickPriceResponse.askPrice
      console.log("💱 GraphQL tick price received:", tickPrice)

      // Perform calculations with live rates
      const positionData = calculatePositionSize(
        snapshot.accountBalance,
        snapshot.riskPercentage,
        snapshot.stopLossPips,
        findCurrencyPairEnum(snapshot.currencyPair),
        snapshot.accountCurrency,
        tickPrice,
        accountCurrencyWeight,
      )

      // let riskRewardData = { riskRewardRatio: 0, potentialProfit: 0, potentialLoss: 0 }
      // if (snapshot.takeProfitPips > 0) {
      //   riskRewardData = calculateRiskReward(
      //     snapshot.takeProfitPips,
      //     snapshot.stopLossPips,
      //     positionData.standardLots,
      //     positionData.pipValue,
      //   )
      // }

      // const drawdown = calculateDrawdown(positionData.amountAtRisk, snapshot.accountBalance)

      // const optimalData = calculatePositionSize(
      //   snapshot.accountBalance,
      //   2,
      //   snapshot.stopLossPips,
      //   findCurrencyPairEnum(snapshot.currencyPair),
      //   snapshot.accountCurrency,
      //   tickPrice,
      //   accountCurrencyWeight,
      // )

      const newResults = {
        formSnapshot: snapshot,
        exchangeRateInfo: {
          timestamp: tickPriceResponse.timestamp,
          source: tickPriceResponse.source,
          provider: tickPriceResponse.provider,
          cached: tickPriceResponse.cached,
          method: tickPriceResponse.method,
          currentRate: positionData.currentRate,
        },
        results: {
          // amountAtRisk: positionData.amountAtRisk,
          // positionSizeUnits: positionData.positionSizeUnits,
          // standardLots: positionData.standardLots,
          // miniLots: positionData.miniLots,
          // microLots: positionData.microLots,
          pipValue: positionData.pipValue,
          // riskRewardRatio: riskRewardData.riskRewardRatio,
          // potentialProfit: riskRewardData.potentialProfit,
          // potentialLoss: riskRewardData.potentialLoss,
        },
        // drawdownAnalysis: {
        //   fiveLosses: drawdown.fiveLosses,
        //   tenLosses: drawdown.tenLosses,
        //   balanceAfterFive: drawdown.balanceAfterFive,
        //   balanceAfterTen: drawdown.balanceAfterTen,
        // },
        // recommendations: {
        //   suggestedLots: optimalData.standardLots,
        // },
      }

      console.log("✅ GraphQL calculation complete:", newResults)

      // Set results
      calculatedResults.value = newResults
      hasCalculated.value = true
    } catch (err) {
      console.error("❌ GraphQL calculation error:", err)
      error.value = err.message || "Failed to calculate position size. Please try again."
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
