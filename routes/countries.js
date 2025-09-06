// routes/countries.js
const express = require("express");
const router = express.Router();
const countriesController = require("../controllers/countriesController");

// POST /api/countries
router.post("/countries", countriesController.getAllCountries);

module.exports = router;
