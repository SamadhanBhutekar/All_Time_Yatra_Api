const express = require("express");
const router = express.Router();
const driverController = require("../controllers/LogoutDriverController");

// Logout API
router.post("/LogoutDriver_oneway", driverController.logoutDriverOneway);

module.exports = router;
