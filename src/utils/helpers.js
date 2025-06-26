import { CURRENCY_PAIR_OPTIONS } from "../default/constants.js"

export const findCurrencyPairEnum = inputPair => {
  return CURRENCY_PAIR_OPTIONS.find(pair => {
    return pair["value"] === inputPair
  })
}

export const findCurrencyPairEnumByValue = (base, quote) => {
  return CURRENCY_PAIR_OPTIONS.find(pair => {
    return [pair.base, pair.quote].includes(base) && [pair.base, pair.quote].includes(quote)
  })
}
