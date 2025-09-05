const express = require("express");
const router = express.Router();
const registerDriverStep1 = require("../controllers/register_driver_step1");

router.post("/register_driver_step1", registerDriverStep1.registerDriverStep1);

module.exports = router;
