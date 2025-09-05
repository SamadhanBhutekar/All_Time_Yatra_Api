const express = require("express");
const router = express.Router();
const driverController = require("../controllers/DriverProfile");

// ✅ Driver Profile (Oneway)
router.post("/DriverProfile_oneway", driverController.driverProfileOneway);

module.exports = router;
