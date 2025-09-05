const express = require("express");
const cors = require("cors");
const serverless = require("serverless-http");
const pool = require("../config/db_api");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/dbtest", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT NOW() AS currentTime");
    res.json({ success: true, rows });
  } catch (err) {
    console.error("❌ DB Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Export for Vercel
module.exports = app;
module.exports.handler = serverless(app);
