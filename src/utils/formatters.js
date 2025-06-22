/**
 * Format currency values with proper localization
 * @param {number} value - The value to format
 * @param {string} currency - Currency code (optional)
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value, currency = null, decimals = 2) => {
  if (typeof value !== "number" || isNaN(value)) return "0.00"

  const options = {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }

  if (currency) {
    options.style = "currency"
    options.currency = currency
  }

  return new Intl.NumberFormat("en-US", options).format(value)
}

/**
 * Format numbers with specified decimal places
 * @param {number} value - The value to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number string
 */
export const formatNumber = (value, decimals = 4) => {
  if (typeof value !== "number" || isNaN(value)) return "0.0000"

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/**
 * Format percentage values
 * @param {number} value - The value to format (as decimal, e.g., 0.02 for 2%)
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value, decimals = 2) => {
  if (typeof value !== "number" || isNaN(value)) return "0.00%"

  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/**
 * Get color class for risk-reward ratio
 * @param {number} ratio - Risk-reward ratio
 * @returns {string} Tailwind CSS color class
 */
export const getRiskRewardColor = ratio => {
  if (ratio >= 3) return "text-green-600"
  if (ratio >= 2) return "text-yellow-600"
  return "text-red-600"
}

/**
 * Get risk level color based on percentage
 * @param {number} riskPercentage - Risk percentage
 * @returns {string} Tailwind CSS color class
 */
export const getRiskLevelColor = riskPercentage => {
  if (riskPercentage <= 2) return "text-green-600"
  if (riskPercentage <= 5) return "text-yellow-600"
  return "text-red-600"
}

/**
 * Format large numbers with K, M, B suffixes
 * @param {number} value - The value to format
 * @returns {string} Formatted number with suffix
 */
export const formatLargeNumber = value => {
  if (typeof value !== "number" || isNaN(value)) return "0"

  const absValue = Math.abs(value)
  const sign = value < 0 ? "-" : ""

  if (absValue >= 1e9) {
    return sign + (absValue / 1e9).toFixed(1) + "B"
  } else if (absValue >= 1e6) {
    return sign + (absValue / 1e6).toFixed(1) + "M"
  } else if (absValue >= 1e3) {
    return sign + (absValue / 1e3).toFixed(1) + "K"
  }

  return sign + absValue.toString()
}
