import "dotenv/config"
import express from "express"
import cors from "cors"
import path from "path"
import { fileURLToPath } from "url"
import { priceRegistry } from "./sources/PriceRegistry.js"
import { TwelveDataSource } from "./sources/TwelveDataSource.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST_DIR = path.resolve(__dirname, "../dist")
const DEFAULT_PORT = 5000

// Register price sources
priceRegistry.register(new TwelveDataSource(process.env.TWELVE_DATA_API_KEY))

const app = express()
app.use(cors())
app.use(express.json())

// Fixed response format: { price: <number>, source: <string>, pair: <string> }
app.get("/api/price/:pair", async (req, res) => {
  try {
    const pair = req.params.pair.toUpperCase()
    const price = await priceRegistry.fetchPrice(pair)

    res.set("Cache-Control", "no-store")
    res.json({
      price,
      source: priceRegistry.getActive(),
      pair,
    })
  } catch (error) {
    console.error("Price fetch error:", error.message)
    res.status(500).json({ error: error.message })
  }
})

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", source: priceRegistry.getActive() })
})

// Serve Vue SPA static files
app.use(express.static(DIST_DIR))

// SPA fallback
app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(DIST_DIR, "index.html"))
})

const PORT = process.env.PORT || DEFAULT_PORT
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT} [source: ${priceRegistry.getActive()}]`)
})
