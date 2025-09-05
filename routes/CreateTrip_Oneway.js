const express = require("express");
const router = express.Router();
const createTrip = require("../controllers/CreateTrip_oneway");

// Trip Summary API
router.post("/CreateTrip_oneway", createTrip.createTripOneway);

module.exports = router;
