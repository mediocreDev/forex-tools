export class PriceSource {
  get name() {
    throw new Error("PriceSource subclass must implement 'name' getter")
  }

  async fetchPrice(pair) {
    throw new Error("PriceSource subclass must implement fetchPrice(pair)")
  }
}
