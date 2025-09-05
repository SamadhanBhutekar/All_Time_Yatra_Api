const express = require("express");
const router = express.Router();

const driverAllTrips = require("../controllers/DriverAllTrips");

router.post("/DriverAllTrips_oneway", driverAllTrips.driverAllTripsOneway);

module.exports = router;
