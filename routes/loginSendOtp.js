const express = require("express");
const router = express.Router();
const SendOtp = require("../controllers/loginSendOtp_Oneway");

// ✅ Driver Dashboard (Oneway)
router.post("/loginSendOtp_Oneway", SendOtp.loginSendOtpOneway);

module.exports = router;
