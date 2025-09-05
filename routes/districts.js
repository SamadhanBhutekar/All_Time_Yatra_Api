const express = require("express");
const router = express.Router();
const userExists = require("../controllers/CheckUserExist");

// ✅ Check if driver exists
router.post("/CheckuserExists_oneway", userExists.checkUserExistsOneway);

module.exports = router;
