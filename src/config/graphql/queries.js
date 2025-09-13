// GraphQL queries for exchange rates

// Get current exchange rates for all supported pairs
export const GET_TICK_PRICE = `
  query PipValuePrice($askSymbolId: ID!) {
      ask: symbol(id: $askSymbolId) {
          price
          broker {
              id
              name
          }
          base
          cross
          title
      }
  }
`
