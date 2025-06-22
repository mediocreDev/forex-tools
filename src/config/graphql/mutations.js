// GraphQL mutations for exchange rate service

// Create a rate alert
export const CREATE_RATE_ALERT = `
  mutation CreateRateAlert($input: RateAlertInput!) {
    createRateAlert(input: $input) {
      id
      pair
      targetRate
      condition
      isActive
      createdAt
      user {
        id
        email
      }
    }
  }
`

// Update rate alert
export const UPDATE_RATE_ALERT = `
  mutation UpdateRateAlert($id: ID!, $input: RateAlertUpdateInput!) {
    updateRateAlert(id: $id, input: $input) {
      id
      pair
      targetRate
      condition
      isActive
      updatedAt
    }
  }
`

// Delete rate alert
export const DELETE_RATE_ALERT = `
  mutation DeleteRateAlert($id: ID!) {
    deleteRateAlert(id: $id) {
      success
      message
    }
  }
`

// Log trading calculation
export const LOG_CALCULATION = `
  mutation LogCalculation($input: CalculationLogInput!) {
    logCalculation(input: $input) {
      id
      type
      parameters
      result
      timestamp
      user {
        id
      }
    }
  }
`
