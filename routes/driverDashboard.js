const express = require("express");
const router = express.Router();
const driverController = require("../controllers/DriverDashboard");

// ✅ Driver Dashboard (Oneway)
router.post("/DriverDashboard_oneway", driverController.driverDashboardOneway);

module.exports = router;
