import axios from "axios"
import { PriceSource } from "./PriceSource.js"

const BASE_URL = "https://api.twelvedata.com"
const QUOTE_CURRENCY_LENGTH = 3

export class TwelveDataSource extends PriceSource {
  constructor(apiKey) {
    super()
    if (!apiKey) {
      throw new Error("TWELVE_DATA_API_KEY is required")
    }
    this.apiKey = apiKey
  }

  get name() {
    return "twelvedata"
  }

  async fetchPrice(pair) {
    // Convert EURUSD → EUR/USD, USOILUSD → USOIL/USD
    const symbol = pair.includes("/")
      ? pair
      : `${pair.slice(0, -QUOTE_CURRENCY_LENGTH)}/${pair.slice(-QUOTE_CURRENCY_LENGTH)}`

    const response = await axios.get(`${BASE_URL}/price`, {
      params: { symbol, apikey: this.apiKey },
    })

    if (response.data?.status === "error") {
      throw new Error(response.data.message)
    }

    const price = parseFloat(response.data?.price)
    if (isNaN(price)) {
      throw new Error("Invalid price response")
    }

    return price
  }
}
