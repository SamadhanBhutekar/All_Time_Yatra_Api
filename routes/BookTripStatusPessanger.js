const express = require("express");
const router = express.Router();
const BookStatusPessanger = require("../controllers/BookTripStatusPassenger");

// Trip Summary API
router.post(
  "/BookTripStatusPassenger",
  BookStatusPessanger.bookTripStatusPassenger
);

module.exports = router;
