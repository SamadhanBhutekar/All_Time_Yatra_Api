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

exports.getDriverNotifications = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM notifications WHERE deleted = 0 AND type = 'driver' ORDER BY id DESC"
    );

    if (rows.length > 0) {
      return res.json({
        status: true,
        error: 0,
        success: 1,
        msg: 'Loaded Successfully',
        result: rows,
      });
    } else {
      return res.json({
        status: false,
        error: 1,
        success: 0,
        msg: 'No data found',
      });
    }
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: 'Server Error',
    });
  }
};
