// routes/booking.js
const express = require("express");
const router = express.Router();
//
const bookingController = require("../controllers/bookingController");
//
router.post("/get-other-charges", bookingController.getOtherCharges); // POST
router.get("/get-booking-rides", bookingController.getBookingRides); // POST
router.get("/status-booking-rides", bookingController.statusBookingRides); // POST
router.get("/booking-user-info", bookingController.bookedUserInfo);
router.get("/trip-Status", bookingController.tripStatus);
router.get("/count-rides", bookingController.countRides);
router.get("/get-Rating-By-BookId", bookingController.getRatingByBookId);
router.get("/accept_cancel_status", bookingController.acceptOrCancelRide);
router.get("/check_book_status", bookingController.checkBookStatus); // GET
router.post("/bookRide", bookingController.bookRide); // GET
//
module.exports = router;
//
