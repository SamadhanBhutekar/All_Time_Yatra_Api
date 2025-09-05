// routes/CompletedTripsOneway.js
const express = require("express");
const router = express.Router();
const completedTripsOneway = require("../controllers/CompletedTripsOneway");

router.post("/CompletedTripsOneway", completedTripsOneway.completedTripsOneway);

module.exports = router;
