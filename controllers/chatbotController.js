const db = require('../config/db_api');
require('dotenv').config();
const bcrypt = require('bcrypt');
const sharp = require('sharp');
const Joi = require('joi');
const fs = require('fs');
const path = require('path');
const axios = require('axios'); // Use for you can make HTTP requests easily.

const { logError } = require('../utils/logger');
const { OpenAI } = require('openai'); // ✅ This is the correct import for v4+

require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

exports.driverChatbot = async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const chatCompletion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // You can change to gpt-4 if you have access
      messages: [
        {
          role: 'system',
          content:
            'You are a friendly and helpful support assistant for JeeyoRide drivers. Answer clearly and politely.',
        },
        { role: 'user', content: message },
      ],
    });

    const botResponse = chatCompletion.choices[0].message.content;

    res.status(200).json({ response: botResponse });
  } catch (err) {
    console.error('OpenAI Error:', err.message);
    res.status(500).json({ error: 'Something went wrong with the chatbot.' });
  }
};
