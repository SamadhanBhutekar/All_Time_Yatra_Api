const express = require("express");
const router = express.Router();
const statesController = require("../controllers/statesController");

router.post("/oneway_state", statesController.getAllStates);

module.exports = router;
