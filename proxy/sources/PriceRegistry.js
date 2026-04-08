import { PriceSource } from "./PriceSource.js"

class PriceRegistry {
  constructor() {
    this.sources = new Map()
    this.active = null
  }

  register(source) {
    if (!(source instanceof PriceSource)) {
      throw new Error("Source must extend PriceSource")
    }
    this.sources.set(source.name, source)
    if (!this.active) {
      this.active = source.name
    }
  }

  use(name) {
    if (!this.sources.has(name)) {
      throw new Error(`Price source "${name}" not registered`)
    }
    this.active = name
  }

  async fetchPrice(pair) {
    const source = this.sources.get(this.active)
    if (!source) {
      throw new Error("No active price source")
    }
    return source.fetchPrice(pair)
  }

  getActive() {
    return this.active
  }

  list() {
    return Array.from(this.sources.keys())
  }
}

export const priceRegistry = new PriceRegistry()
