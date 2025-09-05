// routes/CompletedTripsOneway.js
const express = require("express");
const router = express.Router();
const rating = require("../controllers/DriverRating_OneWay");

router.post("/giveRating", rating.giveRating);

module.exports = router;
