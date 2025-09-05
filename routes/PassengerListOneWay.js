const express = require("express");
const router = express.Router();
const PassengersList = require("../controllers/PassengerList_oneway");

// Trip Summary API
router.post("/PassengerList_oneway", PassengersList.passengerListOneway);

module.exports = router;
