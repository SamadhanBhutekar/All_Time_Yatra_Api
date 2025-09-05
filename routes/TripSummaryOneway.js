const express = require("express");
const router = express.Router();
const tripSummary = require("../controllers/TripSummaryOneway");

// Trip Summary API
router.post("/TripSummary_oneway", tripSummary.tripSummaryOneway);

module.exports = router;
