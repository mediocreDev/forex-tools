import { reactive, ref } from "vue"
import {
  calculatePositionSize,
  calculateRiskReward,
  calculateDrawdown,
} from "../utils/calculations.js"
import { CURRENCY_PAIR_OPTIONS } from "../default/constants.js"
import { tickPriceService } from "../services/tickPriceService.js"

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

  const calculate = async () => {
    console.log("🔥 CALCULATE FUNCTION CALLED!")
    console.log("Current form data:", JSON.stringify(formData, null, 2))

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

      // Fetch tick price using GraphQL service
      console.log("🔮 Fetching tick price via GraphQL service...")
      const currencyPair = CURRENCY_PAIR_OPTIONS.find(pair => {
        return pair["value"] === formData.currencyPair
      })
      const tickPriceResponse = await tickPriceService.fetchTickPrice(currencyPair)
      const tickPrice = tickPriceResponse.askPrice

      console.log("💱 GraphQL tick price received:", tickPrice)

      // Perform calculations with live rates
      const positionData = calculatePositionSize(
        snapshot.accountBalance,
        snapshot.riskPercentage,
        snapshot.stopLossPips,
        snapshot.currencyPair,
        snapshot.accountCurrency,
        tickPrice,
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
          positionData.positionSizeUnits,
          positionData.pipValue,
        )
      }

      const drawdown = calculateDrawdown(positionData.amountAtRisk, snapshot.accountBalance)

      const optimalData = calculatePositionSize(
        snapshot.accountBalance,
        2,
        snapshot.stopLossPips,
        snapshot.currencyPair,
        snapshot.accountCurrency,
        tickPrice,
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
          positionSizeUnits: positionData.positionSizeUnits,
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
