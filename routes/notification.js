const express = require('express');
const router = express.Router();
//
const multer = require('multer');
const storage = multer.memoryStorage(); // Use memory for sharp
const upload = multer({ storage });
//
const notificationController = require('../controllers/notificationController');
//

router.get(
  '/get-All-Notification',
  notificationController.getDriverNotifications
);

//
module.exports = router;
//
