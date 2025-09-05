const db = require('../config/db_api');
require('dotenv').config();
const bcrypt = require('bcrypt');
const sharp = require('sharp');
const Joi = require('joi');
const fs = require('fs');
const path = require('path');
const axios = require('axios'); // Use for you can make HTTP requests easily.

const { logError } = require('../utils/logger');

//
exports.adminLogin = async (req, res) => {
  const { username, password } = req.body;
  console.log(`username ${username}`);
  console.log(`password ${password}`);

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password required' });
  }

  try {
    const [rows] = await db.query(
      'SELECT * FROM admin WHERE username = ? AND password = ?',
      [username, password]
    );

    if (rows.length > 0) {
      return res.status(200).json({ message: 'Login successful' });
    } else {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Database error', error });
  }
};
