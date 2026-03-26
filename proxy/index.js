import express from "express"
import axios from "axios"
import cors from "cors"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST_DIR = path.resolve(__dirname, "../dist")

const app = express()
app.use(cors())
app.use(express.json())

// Proxy POST request to external GraphQL API
app.post("/api", async (req, res) => {
  try {
    const response = await axios.post("https://marketmilk.babypips.com/api", req.body, {
      headers: {
        "Content-Type": "application/json",
      },
    })
    res.json(response.data)
  } catch (error) {
    console.error(error?.response?.data || error.message)
    res.status(500).json({ error: "Proxy failed" })
  }
})

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" })
})

// Serve Vue SPA static files
app.use(express.static(DIST_DIR))

// SPA fallback — all non-API routes serve index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(DIST_DIR, "index.html"))
})

const PORT = process.env.PORT || 5000
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`)
})
