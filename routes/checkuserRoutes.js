const express = require("express");
const router = express.Router();
const userExists = require("../controllers/CheckUserExist");

console.log("Loaded controller:", userExists); // Debug

router.post("/CheckuserExists_oneway", userExists.checkUserExistsOneway);

module.exports = router;
