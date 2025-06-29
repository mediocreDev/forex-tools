// Get pip size for a currency pair
export const getPipSize = currencyPair => {
  if (currencyPair.base === "XAU") return 0.1
  if (currencyPair.base === "USOIL") return 0.01
  if (currencyPair.base === "BTC") return 10
  if (currencyPair.quote === "JPY") return 0.01
  return 0.0001
}

// Get number of units per a standard lot
export const getUnitNumberPerAStandardLot = currencyPair => {
  if (currencyPair.base === "XAU") return 100
  if (currencyPair.base === "USOIL") return 1000
  if (currencyPair.base === "BTC") return 1
  return 100000
}

// Get pip value per a standard lot for a currency pair
export const getPipValuePerStandardLot = (currencyPair, accountCurrencyWeight) => {
  const pipSize = getPipSize(currencyPair)
  const unitNumberPerAStandardLot = getUnitNumberPerAStandardLot(currencyPair)
  return pipSize * unitNumberPerAStandardLot * accountCurrencyWeight
}

// Calculate position size based on risk parameters with live rates
export const calculatePositionSize = (
  accountBalance,
  riskPercentage,
  stopLossPips,
  currencyPair,
  accountCurrency,
  tickPrice,
  accountCurrencyWeight,
) => {
  const amountAtRisk = accountBalance * (riskPercentage / 100)
  const pipValuePerStandardLot = getPipValuePerStandardLot(currencyPair, accountCurrencyWeight)
  const unitNumberPerAStandardLot = getUnitNumberPerAStandardLot(currencyPair)
  const standardLots = amountAtRisk / (stopLossPips * pipValuePerStandardLot)

  return {
    amountAtRisk,
    standardLots: standardLots,
    miniLots: standardLots / 10,
    microLots: standardLots / 100,
    positionSize: standardLots * unitNumberPerAStandardLot,
    pipValue: pipValuePerStandardLot,
    currentRate: tickPrice || "😔 Fetching failed!",
  }
}

// Calculate risk-reward metrics
export const calculateRiskReward = (takeProfitPips, stopLossPips, standardLots, pipValue) => {
  if (takeProfitPips <= 0 || stopLossPips <= 0) {
    return { riskRewardRatio: 0, potentialProfit: 0, potentialLoss: 0 }
  }

  const riskRewardRatio = takeProfitPips / stopLossPips
  const potentialProfit = takeProfitPips * pipValue * standardLots
  const potentialLoss = stopLossPips * pipValue * standardLots

  return { riskRewardRatio, potentialProfit, potentialLoss }
}

// Calculate drawdown scenarios
export const calculateDrawdown = (amountAtRisk, accountBalance) => {
  const scenarios = [5, 10, 15, 20]
  const drawdownData = {}

  scenarios.forEach(losses => {
    const totalLoss = amountAtRisk * losses
    const remainingBalance = accountBalance - totalLoss
    const drawdownPercentage = (totalLoss / accountBalance) * 100

    drawdownData[`${losses}Losses`] = {
      totalLoss,
      remainingBalance,
      drawdownPercentage,
    }
  })

  return {
    fiveLosses: drawdownData["5Losses"].totalLoss,
    tenLosses: drawdownData["10Losses"].totalLoss,
    fifteenLosses: drawdownData["15Losses"].totalLoss,
    twentyLosses: drawdownData["20Losses"].totalLoss,
    balanceAfterFive: drawdownData["5Losses"].remainingBalance,
    balanceAfterTen: drawdownData["10Losses"].remainingBalance,
    balanceAfterFifteen: drawdownData["15Losses"].remainingBalance,
    balanceAfterTwenty: drawdownData["20Losses"].remainingBalance,
    scenarios: drawdownData,
  }
}
