// GraphQL queries for exchange rates

// Get current exchange rates for all supported pairs
export const GET_TICK_PRICE = `
  query PipValuePrice($askSymbolId: ID!) {
      ask: symbol(id: $askSymbolId) {
          price
      }
  }
`

// Get specific exchange rate for a currency pair
export const GET_CURRENCY_PAIR_RATE = `
  query GetCurrencyPairRate($pair: String!) {
    currencyPair(pair: $pair) {
      pair
      rate
      bid
      ask
      spread
      timestamp
      source
      volatility {
        daily
        weekly
        monthly
      }
    }
  }
`

// Get historical exchange rates
export const GET_HISTORICAL_RATES = `
  query GetHistoricalRates($pair: String!, $from: String!, $to: String!, $interval: String!) {
    historicalRates(pair: $pair, from: $from, to: $to, interval: $interval) {
      pair
      interval
      data {
        timestamp
        open
        high
        low
        close
        volume
      }
    }
  }
`

// Get multiple currency pairs at once
export const GET_MULTIPLE_PAIRS = `
  query GetMultiplePairs($pairs: [String!]!) {
    multiplePairs(pairs: $pairs) {
      pair
      rate
      bid
      ask
      spread
      timestamp
      change24h
      changePercent24h
    }
  }
`

// Get market status and trading hours
export const GET_MARKET_STATUS = `
  query GetMarketStatus {
    marketStatus {
      isOpen
      nextOpen
      nextClose
      timezone
      tradingSessions {
        name
        open
        close
        isActive
      }
    }
  }
`

// Get currency information
export const GET_CURRENCY_INFO = `
  query GetCurrencyInfo($currencies: [String!]!) {
    currencies(codes: $currencies) {
      code
      name
      symbol
      country
      isActive
      decimalPlaces
    }
  }
`

// Real-time subscription for exchange rate updates
export const SUBSCRIBE_EXCHANGE_RATES = `
  subscription SubscribeExchangeRates($pairs: [String!]!) {
    exchangeRateUpdates(pairs: $pairs) {
      pair
      rate
      bid
      ask
      timestamp
      change
      changePercent
    }
  }
`
