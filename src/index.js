const express = require("express");
const cors = require("cors");
const serverless = require("serverless-http");
const pool = require("./config/db_api");

const app = express();
app.use(cors());
app.use(express.json());

// Root route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to All_Time_Yatra_API 🚀",
    endpoints: {
      health: "/api/health",
      echo: "/api/echo",
      dbtest: "/api/dbtest",
    },
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "API is working ✅",
    timestamp: new Date().toISOString(),
  });
});

// DB test route
app.get("/api/dbtest", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT NOW() AS currentTime");
    res.json({ success: true, rows });
  } catch (err) {
    console.error("❌ DB Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST echo example
app.post("/api/echo", (req, res) => {
  res.json({ success: true, received: req.body });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Export for Vercel
module.exports = app;
module.exports.handler = serverless(app);
