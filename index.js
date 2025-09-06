const express = require("express");
const app = express();

const router = express.Router();
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();
const db = require("./config/db_api");
const session = require("express-session");
app.use(
  session({
    secret: "jeeyoride@admin", // use strong key in production
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // secure: true only when using HTTPS
  })
);

// ✅ Correctly placed CORS config (FIRST middleware)
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "PATCH"],
    credentials: true,
    allowedHeaders: ["Content-Type"],
  })
);
app.use(express.json());
//
//
// Static files (for accessing uploaded images)
app.use("/", express.static(path.join(process.cwd(), "uploads")));

app.use("drivers_kyc", express.static(__dirname + "drivers_kyc"));

app.get("/", (req, res) => res.send({ message: "Server is alive!" }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
