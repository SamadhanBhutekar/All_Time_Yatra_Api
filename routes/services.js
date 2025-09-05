const express = require("express");
const router = express.Router();
const servicesController = require("../controllers/servicesController");

router.post("/ServiceType", servicesController.getAllServices);

module.exports = router;
