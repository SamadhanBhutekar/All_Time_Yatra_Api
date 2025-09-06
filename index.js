const express = require("express");
const app = express();

const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
require("dotenv").config();
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);

// ✅ Database session store configuration
const sessionOptions = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "test",
};

const sessionStore = new MySQLStore(sessionOptions);

// ✅ Session middleware (MySQL-backed, safe for production)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "jeeyoride@admin", // store in .env in production
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // set true if HTTPS
      httpOnly: true, // prevent JS access to cookies
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);

// ✅ Security middleware
app.use(helmet());

// ✅ Rate limiting (100 requests per 15 min per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

// ✅ Correctly placed CORS config
app.use(
  cors({
    origin: "http://localhost:3000", // change in production
    methods: ["GET", "POST", "PUT", "PATCH"],
    credentials: true,
    allowedHeaders: ["Content-Type"],
  })
);

// ✅ JSON parsing
app.use(express.json());

// ✅ Static files (for uploaded images & drivers_kyc)
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/drivers_kyc", express.static(path.join(__dirname, "drivers_kyc")));

// ✅ Health check route
app.get("/", (req, res) => res.send({ message: "Server is alive!" }));

// ✅ Routes
const countriesRoutes = require("./routes/countries");
app.use("/api", countriesRoutes);

// ✅ Server start
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
