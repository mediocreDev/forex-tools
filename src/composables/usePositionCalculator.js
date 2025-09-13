import { reactive, ref } from "vue"
import { tickPriceService } from "../services/tickPriceService.js"
import {
  calculateDrawdown,
  calculatePositionSize,
  calculateRiskReward,
} from "../utils/calculations.js"
import { findCurrencyPairEnum, findCurrencyPairEnumByValue } from "../utils/helpers.js"

export function usePositionCalculator() {
  // Form data - completely separate
  const formData = reactive({
    accountCurrency: "USD",
    accountBalance: 1000,
    riskPercentage: 2,
    stopLossPips: 35,
    takeProfitPips: 70,
    currencyPair: "EURUSD",
  })

  // Results - completely isolated, no initial calculation
  const hasCalculated = ref(false)
  const calculatedResults = ref(null)
  const isLoading = ref(false)
  const error = ref(null)

  // Calculation Handler
  const calculate = async () => {
    console.log("🔥 CALCULATE FUNCTION CALLED!")

    // Reset states
    isLoading.value = true
    error.value = null

    try {
      // Take a complete snapshot to break any reactive links
      const snapshot = JSON.parse(
        JSON.stringify({
          accountCurrency: formData.accountCurrency,
          accountBalance: formData.accountBalance,
          riskPercentage: formData.riskPercentage,
          stopLossPips: formData.stopLossPips,
          takeProfitPips: formData.takeProfitPips,
          currencyPair: formData.currencyPair,
        }),
      )
      console.log("📸 Snapshot taken:", snapshot)

      const currencyPairEnum = findCurrencyPairEnum(formData.currencyPair)

      // Fetch tick price using GraphQL service
      console.log("🔮 Fetching tick price via GraphQL service...")
      const tickPriceResponse = await tickPriceService.fetchTickPrice(currencyPairEnum)
      const tickPrice = tickPriceResponse.askPrice
      console.log("💱 GraphQL tick price received:", tickPrice)

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

      // Perform calculations with live rates
      const positionData = calculatePositionSize(
        snapshot.accountBalance,
        snapshot.riskPercentage,
        snapshot.stopLossPips,
        currencyPairEnum,
        snapshot.accountCurrency,
        tickPrice,
        accountCurrencyWeight,
      )

      let riskRewardData = {
        riskRewardRatio: 0,
        potentialProfit: 0,
        potentialLoss: 0,
      }
      if (snapshot.takeProfitPips > 0) {
        riskRewardData = calculateRiskReward(
          snapshot.takeProfitPips,
          snapshot.stopLossPips,
          positionData.standardLots,
          positionData.pipValue,
        )
      }

      const drawdown = calculateDrawdown(positionData.amountAtRisk, snapshot.accountBalance)

      const optimalData = calculatePositionSize(
        snapshot.accountBalance,
        2,
        snapshot.stopLossPips,
        findCurrencyPairEnum(snapshot.currencyPair),
        snapshot.accountCurrency,
        tickPrice,
        accountCurrencyWeight,
      )

      // Create completely new result object
      const newResults = {
        formSnapshot: snapshot,
        exchangeRateInfo: {
          timestamp: tickPriceResponse.timestamp,
          source: tickPriceResponse.source,
          broker: tickPriceResponse.broker,
          cached: tickPriceResponse.cached,
          method: tickPriceResponse.method,
          currentRate: positionData.currentRate,
        },
        results: {
          amountAtRisk: positionData.amountAtRisk,
          positionSize: positionData.positionSize,
          standardLots: positionData.standardLots,
          miniLots: positionData.miniLots,
          microLots: positionData.microLots,
          pipValue: positionData.pipValue,
          riskRewardRatio: riskRewardData.riskRewardRatio,
          potentialProfit: riskRewardData.potentialProfit,
          potentialLoss: riskRewardData.potentialLoss,
        },
        drawdownAnalysis: {
          fiveLosses: drawdown.fiveLosses,
          tenLosses: drawdown.tenLosses,
          balanceAfterFive: drawdown.balanceAfterFive,
          balanceAfterTen: drawdown.balanceAfterTen,
        },
        recommendations: {
          suggestedLots: optimalData.standardLots,
        },
      }

      console.log("✅ Calculation complete:", newResults)

      // Set results
      calculatedResults.value = newResults
      hasCalculated.value = true
    } catch (err) {
      console.error("❌ Calculation error:", err)
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
