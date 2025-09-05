const express = require("express");
const router = express.Router();
const registerDriverStep4 = require("../controllers/register_driver_step4");

router.post("/register_driver_step4", registerDriverStep4.registerDriverStep4);

module.exports = router;
