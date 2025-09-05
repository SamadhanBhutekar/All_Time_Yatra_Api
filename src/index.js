const express = require("express");
const cors = require("cors");
const serverless = require("serverless-http");

const app = express();

app.use(cors());
app.use(express.json());

// ✅ health route
app.get("/api/health", (req, res) => {
  return res.json({
    success: true,
    message: "API is working ✅",
    timestamp: new Date().toISOString(),
  });
});

// ✅ echo route
app.post("/api/echo", (req, res) => {
  return res.json({
    success: true,
    received: req.body,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Export for Vercel
module.exports = app;
module.exports.handler = serverless(app);
