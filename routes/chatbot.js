const express = require('express');
const router = express.Router();
const driverChatbotController = require('../controllers/chatbotController');
//
router.post('/driver-Chatbot', driverChatbotController.driverChatbot); // POST
module.exports = router;
//
