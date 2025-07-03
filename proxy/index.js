import express from "express"
import axios from "axios"
import cors from "cors"

const app = express()
app.use(cors())
app.use(express.json())

// Proxy POST request to external GraphQL API
app.post("/api", async (req, res) => {
  try {
    console.log(req)
    const response = await axios.post("https://marketmilk.babypips.com/api", req.body, {
      headers: {
        "Content-Type": "application/json",
      },
    })
    console.log("response", response)
    res.json(response.data)
  } catch (error) {
    console.error(error?.response?.data || error.message)
    res.status(500).json({ error: "Proxy failed" })
  }
})

// ✅ Add this basic route
app.get('/health', (req, res) => {
  res.send({ status: 'ok' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Express server running on http://localhost:${PORT}`)
})
