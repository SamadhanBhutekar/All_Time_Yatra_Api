const express = require("express");
const router = express.Router();
//
const multer = require("multer");
// const storage = multer.memoryStorage(); // Use memory for sharp
// const upload = multer({ storage });
//
const userController = require("../controllers/userController");

// Image upload setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/user_profiles"),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname.replace(/\s/g, "");
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });
router.post("/OneWay_UserRegister", userController.OneWay_UserRegister);
router.post("/OneWay_UserLogin", userController.OneWay_UserLogin); // POST
router.post("/verifyOtp_UserOneway", userController.verifyOtp_UserOneway); // POST
router.post("/OneWay_RideList", userController.OneWay_RideList); // POST

//
module.exports = router;
//
