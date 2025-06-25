// Get pip value for a currency pair using live rates
export const getPipValue = (currencyPair, balanceUnitMultiplier) => {
  const pipSize = currencyPair.quote === "JPY" ? 0.01 : 0.0001
  return pipSize * balanceUnitMultiplier
}

// Calculate position size based on risk parameters with live rates
export const calculatePositionSize = (
  accountBalance,
  riskPercentage,
  stopLossPips,
  currencyPair,
  accountCurrency,
  tickPrice,
  balanceUnitMultiplier,
) => {
  const amountAtRisk = accountBalance * (riskPercentage / 100)
  const pipValue = getPipValue(currencyPair, balanceUnitMultiplier)
  console.log(pipValue)
  const positionSizeUnits = amountAtRisk / (stopLossPips * pipValue)

  return {
    amountAtRisk,
    positionSizeUnits,
    standardLots: positionSizeUnits / 100000,
    miniLots: positionSizeUnits / 10000,
    microLots: positionSizeUnits / 1000,
    pipValue,
    currentRate: tickPrice || "😔 Fetching failed!",
  }
}

// Calculate risk-reward metrics
export const calculateRiskReward = (takeProfitPips, stopLossPips, positionSizeUnits, pipValue) => {
  if (takeProfitPips <= 0 || stopLossPips <= 0) {
    return { riskRewardRatio: 0, potentialProfit: 0, potentialLoss: 0 }
  }

  const riskRewardRatio = takeProfitPips / stopLossPips
  const potentialProfit = takeProfitPips * pipValue * positionSizeUnits
  const potentialLoss = stopLossPips * pipValue * positionSizeUnits

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

// Calculate pip value for pip calculator with live rates
export const calculatePipValue = (
  currencyPair,
  askPrice,
  positionSize,
  accountCurrency,
  exchangeRates,
) => {
  const [base, quote] = currencyPair.split("/")
  const pipSize = quote === "JPY" ? 0.01 : 0.0001

  let pipValue = 0

  if (accountCurrency === quote) {
    pipValue = pipSize * positionSize
  } else if (accountCurrency === base) {
    pipValue = (pipSize * positionSize) / askPrice
  } else {
    pipValue = pipSize * positionSize
  }

  return Math.round(pipValue * 100) / 100
}

// Get pip size for a currency pair
export const getPipSize = currencyPair => {
  const [, quote] = currencyPair.split("/")
  return quote === "JPY" ? 0.01 : 0.0001
}
