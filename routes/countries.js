const express = require("express");
const router = express.Router();
const countriesController = require("../controllers/countriesController");

router.post("/oneway_country", countriesController.getAllCountries);

module.exports = router;
