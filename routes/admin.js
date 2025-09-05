const express = require('express');
const router = express.Router();
//
const multer = require('multer');
const storage = multer.memoryStorage(); // Use memory for sharp
const upload = multer({ storage });
//
const adminController = require('../controllers/adminController');
//

router.post('/admin-login', adminController.adminLogin);

//
module.exports = router;
//
