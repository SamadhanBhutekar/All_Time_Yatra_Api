const express = require("express");
const router = express.Router();
const driverController = require("../controllers/UpdateTripStatusController");

// Update Trip Status API
router.post("/updatTripStatus_oneway", driverController.updateTripStatusOneway);

module.exports = router;
