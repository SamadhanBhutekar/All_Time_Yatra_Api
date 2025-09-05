const express = require("express");
const router = express.Router();
const VerifyOtp = require("../controllers/VerifyOtp_oneway");

// ✅ Driver Dashboard (Oneway)
router.post("/verifyOtp_oneway", VerifyOtp.verifyOtpOneway);

module.exports = router;
