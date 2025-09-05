const express = require("express");
const router = express.Router();
const registerDriverStep2 = require("../controllers/register_driver_step2");

router.post("/register_driver_step2", registerDriverStep2.registerDriverStep2);

module.exports = router;
