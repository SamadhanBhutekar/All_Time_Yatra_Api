const express = require("express");
const cors = require("cors");
const serverless = require("serverless-http");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Root route (Vercel homepage)
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to All Time Yatra API 🚀",
    docs: {
      health: "/api/health",
      echo: "/api/echo"
    }
  });
});

// ✅ Base API route
app.get("/api", (req, res) => {
  res.json({
    success: true,
    message: "API Base Endpoint",
    endpoints: {
      health: "/api/health",
      echo: "/api/echo"
    }
  });
});

// ✅ Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "API is working ✅",
    timestamp: new Date().toISOString(),
  });
});

// ✅ Echo test
app.post("/api/echo", (req, res) => {
  res.json({
    success: true,
    received: req.body,
  });
});

// ❌ 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

module.exports = app;
module.exports.handler = serverless(app);

