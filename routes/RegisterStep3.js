const express = require("express");
const router = express.Router();
const registerDriverStep3 = require("../controllers/register_driver_step3");

router.post("/register_driver_step3", registerDriverStep3.registerDriverStep3);

module.exports = router;
