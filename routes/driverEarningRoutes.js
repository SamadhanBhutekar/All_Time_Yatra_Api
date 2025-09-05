const express = require("express");
const router = express.Router();
const driverEarning = require("../controllers/DriverEarning");
// ✅ Check if driver exists
router.post("/DriverEarning_oneway", driverEarning.driverEarningOneway);

module.exports = router;
