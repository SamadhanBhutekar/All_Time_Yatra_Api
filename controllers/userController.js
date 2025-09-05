const db = require("../config/db_api");
require("dotenv").config();
const bcrypt = require("bcrypt");
const sharp = require("sharp");
const Joi = require("joi");
const fs = require("fs");
const path = require("path");
const axios = require("axios"); // Use for you can make HTTP requests easily.

const { logError } = require("../utils/logger");

exports.OneWay_UserRegister = async (req, res) => {
  try {
    const {
      user_full_name,
      user_email,
      user_mobile,
      user_country_id,
      user_reffer_to,
      dob,
      gender,
    } = req.body;

    const user_register_at = new Date();
    const refferal_code = Math.floor(1000 + Math.random() * 9000); // 4 digit code

    // ✅ Check required field
    if (!user_mobile) {
      return res
        .status(200)
        .json({ status: false, msg: "Missing parameter: user_mobile" });
    }

    // ✅ Check duplicate mobile
    const [checkphone] = await db.query(
      "SELECT user_mobile FROM oneway_users WHERE user_mobile = ?",
      [user_mobile]
    );
    if (checkphone.length > 0) {
      return res
        .status(200)
        .json({ status: false, msg: "Mobile Number Already Exists" });
    }

    // ✅ Insert user
    const [insertResult] = await db.query(
      `INSERT INTO oneway_users 
        (user_full_name, user_email, user_mobile, user_referal_code, 
         user_register_at, user_country_id, dob, gender, terms_condition)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, '1')`,
      [
        user_full_name || "",
        user_email || "",
        user_mobile,
        refferal_code,
        user_register_at,
        user_country_id || "",
        dob || "",
        gender || "",
      ]
    );

    const userid = insertResult.insertId;
    const username = "YATRAU" + String(userid).padStart(4, "0");

    await db.query("UPDATE oneway_users SET username = ? WHERE id = ?", [
      username,
      userid,
    ]);

    // ✅ Handle referral
    if (user_reffer_to) {
      const [rows] = await db.query(
        "SELECT id FROM oneway_users WHERE user_reffer_to = ? LIMIT 1",
        [user_reffer_to]
      );

      if (rows.length > 0) {
        const getuid = rows[0].id;

        await db.query(
          "UPDATE oneway_users SET user_reffer_to = ? WHERE id = ?",
          [user_reffer_to, userid]
        );

        await db.query(
          "INSERT INTO refferals_list (userid, reffer_to_userid, dt) VALUES (?, ?, NOW())",
          [userid, getuid]
        );

        await db.query(
          "UPDATE oneway_users SET user_reffer_count = user_reffer_count + 1 WHERE user_reffer_to = ?",
          [user_reffer_to]
        );
      }
    }

    // ✅ Fetch inserted user
    const [allData] = await db.query(
      "SELECT id,user_full_name,user_mobile,user_email,user_register_at,dob,gender FROM oneway_users WHERE id = ? LIMIT 1",
      [userid]
    );

    const getdata = allData.length > 0 ? allData[0] : null;

    return res.status(200).json({
      status: true,
      error: 0,
      success: 1,
      msg: "Register Successfully",
      userdata_data: getdata,
    });
  } catch (error) {
    console.error("Error in OneWay_UserRegister:", error);
    return res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Server error",
    });
  }
};

exports.OneWay_UserLogin = async (req, res) => {
  try {
    const { user_mobile } = req.body;
    const otp = Math.floor(1000 + Math.random() * 9000); // 4 digit OTP

    if (!user_mobile) {
      return res.status(200).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Missing Required Parameters",
      });
    }

    // ✅ Check if user exists
    const [rows] = await db.query(
      "SELECT user_mobile FROM oneway_users WHERE user_mobile = ?",
      [user_mobile]
    );

    if (rows.length === 0) {
      return res.status(200).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Sign Up First",
      });
    }

    // ✅ Send OTP using 2Factor API
    const apiKey = "dc22dd14-24c5-11ef-8b60-0200cd936042"; // replace with env
    const otpTemplate = "OTP_LOGIN";

    let response_otp;
    try {
      response_otp = await axios.get(
        `https://2factor.in/API/V1/${apiKey}/SMS/${user_mobile}/${otp}/${otpTemplate}`,
        { timeout: 30000 }
      );
    } catch (error) {
      console.error("OTP API Error:", error.message);
      return res.status(200).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Something went Wrong",
      });
    }

    if (response_otp && response_otp.data) {
      const login_time = new Date().toLocaleTimeString("en-GB", {
        hour12: false,
      }); // HH:mm:ss
      const login_date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

      // ✅ Update old login history
      await db.query(
        "UPDATE OneWay_user_login_history SET deleted = 1 WHERE user_mobile = ?",
        [user_mobile]
      );

      // ✅ Insert new login history
      await db.query(
        `INSERT INTO OneWay_user_login_history 
          (user_mobile, login_time, login_date, user_otp, deleted) 
         VALUES (?, ?, ?, ?, 0)`,
        [user_mobile, login_time, login_date, otp]
      );

      return res.status(200).json({
        status: true,
        error: 0,
        success: 1,
        msg: "OTP Sent Successfully",
        otp, // ⚠️ remove in production
      });
    } else {
      return res.status(200).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Something went Wrong",
      });
    }
  } catch (error) {
    console.error("Error in OneWay_UserLogin:", error);
    return res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Server error",
    });
  }
};

exports.verifyOtp_UserOneway = async (req, res) => {
  try {
    const { user_mobile, user_otp } = req.body;
    const login_time = new Date().toLocaleTimeString("en-GB", {
      hour12: false,
    }); // HH:mm:ss
    const login_date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    if (!user_mobile || !user_otp) {
      return res.status(200).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Missing Required Parameters",
      });
    }

    // ✅ Get latest OTP for this user
    const [rows] = await db.query(
      `SELECT user_otp 
       FROM OneWay_user_login_history 
       WHERE user_mobile = ? AND deleted = 0 
       ORDER BY id DESC LIMIT 1`,
      [user_mobile]
    );

    if (rows.length === 0) {
      return res.status(200).json({
        status: false,
        error: 1,
        success: 0,
        msg: "No OTP found. Please request login again.",
      });
    }

    const dbOtp = rows[0].user_otp;

    // ✅ Verify OTP
    if (user_otp == dbOtp) {
      // Mark OTP as used
      await db.query(
        `UPDATE OneWay_user_login_history 
         SET user_mobile = ?, login_time = ?, login_date = ?, deleted = 1 
         WHERE user_mobile = ?`,
        [user_mobile, login_time, login_date, user_mobile]
      );

      // Get user details
      const [driverData] = await db.query(
        `SELECT id, user_mobile 
         FROM oneway_users 
         WHERE user_mobile = ?`,
        [user_mobile]
      );

      return res.status(200).json({
        status: true,
        error: 0,
        success: 1,
        msg: "Successfully Verified",
        User_data: driverData,
      });
    } else {
      return res.status(200).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Invalid OTP",
      });
    }
  } catch (error) {
    console.error("Error in verifyOtp_UserOneway:", error);
    return res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Server error",
    });
  }
};

// ✅ Helper: extract city name from location string
function extractCity(location) {
  if (!location) return "";
  const parts = location.split(",");
  return parts[0].trim().toLowerCase(); // take only city
}

exports.OneWay_RideList = async (req, res) => {
  try {
    const { userid, pickup_location, dropoff_location, date, passenger_count } =
      req.body;

    // ✅ Split datetime
    let tripdate = "";
    let gettriptime = "";
    if (date) {
      const parts = date.split(" ");
      tripdate = parts[0] || "";
      gettriptime = parts[1] || "";
    }

    // ✅ Validate required fields
    if (
      !userid ||
      !pickup_location ||
      !dropoff_location ||
      !tripdate ||
      !passenger_count
    ) {
      return res.status(200).json({
        status: false,
        success: 0,
        msg: "Missing required params",
      });
    }

    // ✅ Extract cities
    const pickupCity = extractCity(pickup_location); // e.g. "pune"
    const dropoffCity = extractCity(dropoff_location); // e.g. "mumbai"

    // ✅ Fetch rides
    const [getRides] = await db.query(
      `SELECT o.id, o.amount, o.pickup_add, o.drop_add, o.trip_time, 
              o.total_pasanger, b.trip_id 
       FROM outercity_create_ride o 
       LEFT JOIN one_way_drivers d ON o.driverid = d.id 
       LEFT JOIN booking_outercity_ride b ON b.trip_id = o.id
       WHERE o.trip_date = ?
         AND LOWER(o.pickup_add) LIKE ?
         AND LOWER(o.drop_add) LIKE ?`,
      [tripdate, `%${pickupCity}%`, `%${dropoffCity}%`]
    );

    if (!getRides || getRides.length === 0) {
      return res.status(200).json({
        status: false,
        success: 0,
        msg: "No rides found",
        data: [],
      });
    }

    // ✅ Amount percentage (default 15%)
    const [siteDataRows] = await db.query(
      "SELECT amountpercentage FROM OneWay_SiteSetting LIMIT 1"
    );
    const percentage =
      siteDataRows.length > 0 ? siteDataRows[0].amountpercentage : 15;

    const ridesData = [];

    for (const ride of getRides) {
      const rideid = ride.trip_id;

      // convert ride time to 24hr format
      const createtrip_time = new Date(`1970-01-01 ${ride.trip_time}`);
      const rideTimeStr = createtrip_time.toTimeString().split(" ")[0]; // HH:mm:ss

      const rideTime = new Date(`${tripdate} ${rideTimeStr}`).getTime();
      const userTime = new Date(`${tripdate} ${gettriptime}`).getTime();

      // 🚦 Check booking cutoff
      if (userTime > rideTime - 1800 * 1000) {
        ride.booking_status = "Booking Closed";
      } else {
        ride.booking_status = "Available";
      }

      // ✅ Passenger availability
      const [[{ booked }]] = await db.query(
        "SELECT COUNT(*) AS booked FROM OneWay_Booking WHERE rideid = ?",
        [rideid]
      );

      const total_pasanger = parseInt(ride.total_pasanger || 0, 10);
      const availablePassengers = total_pasanger - booked;

      ride.booked_seat = booked;
      ride.available_seat = availablePassengers;

      // ✅ Amount calculation
      const amount = Number(ride.amount) || 0; // force numeric
      const finalAmount = amount + amount * (percentage / 100);
      ride.total_amount = Math.ceil(finalAmount);

      ridesData.push(ride);
    }

    return res.status(200).json({
      status: true,
      success: 1,
      msg: "Ride List",
      data: ridesData,
    });
  } catch (error) {
    console.error("Error in OneWay_RideList:", error);
    return res.status(500).json({
      status: false,
      success: 0,
      msg: "Server error",
    });
  }
};
