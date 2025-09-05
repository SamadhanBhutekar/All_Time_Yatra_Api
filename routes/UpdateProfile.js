const express = require("express");
const router = express.Router();
const updateprofile = require("../controllers/UpdateDriverProfile");

// Trip Summary API
router.post("/update_driver_profile", updateprofile.updateDriverProfile);

module.exports = router;
