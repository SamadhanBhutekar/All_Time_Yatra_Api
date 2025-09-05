const driversController = require("../controllers/driverController");
const express = require("express");
const router = express.Router();
//
const multer = require("multer");
const storage = multer.memoryStorage(); // Use memory for sharp
const upload = multer({ storage });
//
const fields = upload.fields([
  { name: "driver_vehicle_licence", maxCount: 1 },
  { name: "driver_vehicle_insurance", maxCount: 1 },
  { name: "driver_vehicle_rc", maxCount: 1 },
  { name: "driver_vehicle_photo", maxCount: 1 },
  { name: "driver_photo", maxCount: 1 },
]);

router.post("/register-Driver", fields, driversController.registerDriver);
router.post("/checkdevice", fields, driversController.checkDevice);
router.post("/driver_available", driversController.driverOnDutyOffDuty); // POST

router.get("/driver-all-data", driversController.getAllDrivers); // GET
router.post("/loginSendOtp", driversController.loginSendOtp); // POST
// router.post("/driver-login-send-otp", driversController.loginSendOtp); // POST
router.post("/verifyOtp", driversController.driververifyOtp); // POST

router.get("/get_DriverStatus", driversController.getDriverStatus); // POST
router.get("/driver-completed-trips", driversController.driver_completed_trips); // POST
//
router.post("/update-document-id", driversController.updateDocumentId);
//
router.get("/get_Driverprofile", driversController.getIntercityDriverProfile);
//

router.get("/checkPlanValidity", driversController.checkPlanValidity);
router.get("/update-Expired-Plans", driversController.updateExpiredPlans);
router.get("/logout-Driver", driversController.logoutDriver);
router.get("/gst-Clearance", driversController.gstClearance);
router.get("/finalget_other_charges", driversController.finalget_other_charges);
// ================NEW CERETE=========================
router.post(
  "/driver_available_status",
  driversController.driverAvailableStatus
);
router.get("/driver_available", driversController.driverAvailable);
router.get("/driver_earning_amount", driversController.driver_earning_amount);
router.post("/accept_cancel_status", driversController.acceptCancelStatus);

// ==================================
router.get(
  "/ride-completed-user-invoice",
  driversController.ride_completed_user_invoice
);

//

router.get(
  "/update-Registration-FeeStatus",
  driversController.updateRegistrationFeeStatus
);
//
// POST
//
module.exports = router;
//
