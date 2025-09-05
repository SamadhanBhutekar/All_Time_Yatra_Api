require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json()); // parse JSON bodies: req.body

// Root route
app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Welcome to All Time Yatra API 🚀",
  });
});

// Health check
app.get("/api/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "API is working ✅",
    timestamp: new Date().toISOString(),
  });
});

// Echo route
app.post("/api/echo", (req, res) => {
  const data = req.body; // whatever JSON you send
  return res.status(200).json({
    success: true,
    received: data,
  });
});

// 404 handler
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
