const express = require("express");
const router = express.Router();
const driverController = require("../controllers/DriverWeburl");

// Driver weburl endpoint
router.post("/DriverWeburl_oneway", driverController.driverWeburlOneway);

module.exports = router;
