const db = require("../config/db_api");
require("dotenv").config();
const bcrypt = require("bcrypt");
const sharp = require("sharp");
const Joi = require("joi");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const nodemailer = require("nodemailer");
const axios = require("axios"); // Use for you can make HTTP requests easily.
const { format } = require("date-fns");

const { logError } = require("../utils/logger");
// ====================================================================================
// ====================================================================================
// =========================== START LIVE API FOR THE JEEYORIDE =======================
// ====================================================================================
// ====================================================================================

// Utility to compress and store WebP
async function compressToWebp(file, outputDir) {
  const filename = `${Date.now()}-${file.originalname.split(".")[0]}.webp`;
  const outputPath = path.join(__dirname, `../public/${outputDir}/${filename}`);

  await sharp(file.buffer).webp({ quality: 80 }).toFile(outputPath);
  return `${outputDir}/${filename}`;
}

exports.registerDriver = async (req, res) => {
  try {
    const {
      driver_full_name,
      driver_document_id,
      driver_availability,
      driver_email,
      driver_mobile,
      driver_address,
      driver_district_id,
      driver_state_id,
      driver_village,
      driver_country_id,
      driver_vehicle_type_id,
      driver_vehicle_number,
      driver_vehicle_name,
      driver_vehicle_model,
      driver_vehicle_fuel_type,
      driver_language,
      driver_device_id,
      driver_device_token,
      driver_push_subscription_id,
      driver_active_status,
      driver_latitude,
      driver_longitude,
      created_at,
      updated_at,
      service_id,
    } = req.body;

    // Validate required fields
    if (
      !driver_device_token ||
      !driver_full_name ||
      !driver_mobile ||
      !driver_address ||
      !driver_vehicle_type_id ||
      !driver_vehicle_number ||
      !driver_vehicle_model ||
      !driver_language ||
      !driver_country_id
    ) {
      return res
        .status(400)
        .json({ success: 0, msg: "Missing required fields" });
    }

    // Check if mobile already exists
    const [existing] = await db.execute(
      "SELECT driver_mobile FROM drivers WHERE driver_mobile = ?",
      [driver_mobile]
    );
    if (existing.length > 0) {
      return res
        .status(409)
        .json({ success: 0, msg: "Mobile number already exists" });
    }

    // File processing
    const driver_photo = req.files["driver_photo"]?.[0];
    const driver_vehicle_photo = req.files["driver_vehicle_photo"]?.[0];
    const driver_vehicle_licence = req.files["driver_vehicle_licence"]?.[0];
    const driver_vehicle_rc = req.files["driver_vehicle_rc"]?.[0];
    const driver_vehicle_insurance = req.files["driver_vehicle_insurance"]?.[0];

    if (
      !driver_photo ||
      !driver_vehicle_photo ||
      !driver_vehicle_licence ||
      !driver_vehicle_rc
    ) {
      return res
        .status(400)
        .json({ success: 0, msg: "Required document images missing" });
    }

    const fimage = await compressToWebp(driver_photo, "driver_profiles");
    const fimagev = await compressToWebp(driver_vehicle_photo, "driver_kyc");
    const fimaged = await compressToWebp(driver_vehicle_licence, "driver_kyc");
    const fimageu = await compressToWebp(driver_vehicle_rc, "driver_kyc");
    const fimagei = driver_vehicle_insurance
      ? await compressToWebp(driver_vehicle_insurance, "driver_kyc")
      : "";

    const [[vehicleType]] = await db.execute(
      "SELECT vehicle_type_name FROM vehicle WHERE id = ?",
      [driver_vehicle_type_id]
    );

    const [insertResult] = await db.execute(
      `
      INSERT INTO drivers (
        driver_device_token, driver_document_id, driver_full_name, driver_district_id,
        driver_email, driver_mobile, driver_address, driver_vehicle_type_id, driver_vehicle_type_name,
        driver_vehicle_number, driver_vehicle_model, driver_vehicle_name, driver_vehicle_color,
        driver_vehicle_fuel_type, driver_state_id, driver_language, driver_country_id,
        driver_photo, service_id, driver_vehicle_photo, driver_vehicle_licence,
        driver_vehicle_insurance, driver_vehicle_rc, driver_village, created_at,
        driver_latitude, driver_longitude
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        driver_device_token,
        driver_document_id,
        driver_full_name,
        driver_district_id,
        driver_email,
        driver_mobile,
        driver_address,
        driver_vehicle_type_id,
        vehicleType.vehicle_type_name,
        driver_vehicle_number,
        driver_vehicle_model,
        driver_vehicle_name,
        req.body.driver_vehicle_color,
        driver_vehicle_fuel_type,
        driver_state_id,
        driver_language,
        driver_country_id,
        fimage,
        service_id,
        fimagev,
        fimaged,
        fimagei,
        fimageu,
        driver_village,
        created_at,
        driver_latitude,
        driver_longitude,
      ]
    );

    const driverId = insertResult.insertId;
    const dusername = `JEEYORIDED${String(driverId).padStart(4, "0")}`;
    await db.execute(`UPDATE drivers SET username = ? WHERE id = ?`, [
      dusername,
      driverId,
    ]);

    const [[driverData]] = await db.execute(
      `
      SELECT d.*, dof.vehicle_type_registration_fee, dof.vehicle_type_minimum_earning, dof.offer_reg_fee
      FROM drivers d
      JOIN driver_onboarding_fees dof 
        ON d.driver_vehicle_type_id = dof.vehicle_id 
       AND d.driver_district_id = dof.district_id
      WHERE d.id = ?`,
      [driverId]
    );

    res.json({
      status: true,
      error: 0,
      success: 1,
      msg: "Register Successfully",
      driver_data: driverData,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: 0, error: 1, msg: "Server error", err });
  }
};

exports.driverOnDutyOffDuty = async (req, res) => {
  const driverId = req.body.driverid;
  const availability = req.body.availability;
  // logError(
  //   `driverId: ${driverId} (type: ${typeof driverId}), availability: ${availability} (type: ${typeof availability})`
  // );
  // Basic validations
  if (!driverId) {
    return res
      .status(400)
      .json({ status: false, error: 1, success: 0, msg: "Missing driverid" });
  }

  if (availability === undefined || ![0, 1].includes(Number(availability))) {
    return res.status(400).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Missing or invalid availability (must be 0 or 1)",
    });
  }

  try {
    // Check if driver exists
    const [driverRows] = await db.execute(
      "SELECT id FROM drivers WHERE id = ?",
      [driverId]
    );
    if (driverRows.length === 0) {
      return res
        .status(404)
        .json({ status: false, error: 1, success: 0, msg: "Invalid driverid" });
    }

    // Update availability
    const [updateResult] = await db.execute(
      "UPDATE drivers SET driver_availability = ? WHERE id = ?",
      [availability, driverId]
    );
    if (updateResult.affectedRows > 0) {
      // Insert into driver_availability_history
      const now = new Date();
      //
      const availabilityTime = now.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      const availabilityDate = `${String(now.getDate()).padStart(
        2,
        "0"
      )}-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;

      await db.execute(
        `INSERT INTO driver_availability_history 
         (driver_id, availability, status, availability_date, availability_time)
         VALUES (?, ?, ?, ?, ?)`,
        [driverId, availability, 1, availabilityDate, availabilityTime]
      );

      return res.json({
        status: true,
        error: 0,
        success: 1,
        msg: "Successfully updated",
      });
    } else {
      return res
        .status(500)
        .json({ status: false, error: 1, success: 0, msg: "Update failed" });
    }
  } catch (err) {
    console.error("DB Error:", err);
    return res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Internal Server Error",
    });
  }
};

exports.loginSendOtp = async (req, res) => {
  const { driver_mobile, driver_device_id, driver_latitude, driver_longitude } =
    req.body;

  if (!driver_mobile) {
    return res.json({
      status: false,
      error: 1,
      success: 0,
      msg: "Missing Required Parameters",
    });
  }

  try {
    const mobile = driver_mobile.trim().replace(/\D/g, "").slice(-10); // Normalize

    const [checkResult] = await db.execute(
      "SELECT * FROM drivers WHERE driver_mobile = ?",
      [mobile]
    );

    if (checkResult.length === 0) {
      return res.json({
        status: false,
        error: 1,
        success: 0,
        msg: "Sign Up First",
      });
    }

    const otp = Math.floor(1000 + Math.random() * 9000); // 4-digit OTP
    const apiKey = "dc22dd14-24c5-11ef-8b60-0200cd936042";
    const otpUrl = `https://2factor.in/API/V1/${apiKey}/SMS/${mobile}/${otp}/OTP_LOGIN`;

    const otpResponse = await axios.get(otpUrl, {
      headers: { "cache-control": "no-cache" },
      timeout: 30000,
      httpsAgent: new (require("https").Agent)({
        rejectUnauthorized: false,
      }),
    });

    if (otpResponse.data) {
      const login_time = new Date().toTimeString().split(" ")[0]; // HH:MM:SS
      const login_date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

      await db.execute(
        "UPDATE driver_login_history SET deleted = 1 WHERE driver_mobile = ?",
        [mobile]
      );

      await db.execute(
        `INSERT INTO driver_login_history 
          (driver_mobile, login_time, login_date, driver_device_id, driver_latitude, driver_longitude, driver_otp, deleted) 
          VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          mobile,
          login_time,
          login_date,
          driver_device_id,
          driver_latitude,
          driver_longitude,
          otp,
        ]
      );

      return res.json({
        status: true,
        error: 0,
        success: 1,
        msg: "OTP Sent Successfully",
        otp: otp,
      });
    } else {
      return res.json({
        status: false,
        error: 1,
        success: 0,
        msg: "Something went wrong",
      });
    }
  } catch (err) {
    console.error("OTP Error:", err.message);
    return res.json({
      status: false,
      error: 1,
      success: 0,
      msg: "Server Error",
    });
  }
};

// exports.loginSendOtp = async (req, res) => {
//   const { driver_mobile, driver_device_id, driver_latitude, driver_longitude } =
//     req.body;
//   const otp = Math.floor(1000 + Math.random() * 9000); // Generate 4-digit OTP
//   //
//   const now = new Date();
//   //
//   const login_time = now.toLocaleTimeString("en-GB", {
//     hour: "2-digit",
//     minute: "2-digit",
//     hour12: false,
//   });

//   const login_date = `${String(now.getDate()).padStart(2, "0")}-${String(
//     now.getMonth() + 1
//   ).padStart(2, "0")}-${now.getFullYear()}`;

//   //
//   if (!driver_mobile) {
//     return res.status(400).json({
//       status: false,
//       error: 1,
//       success: 0,
//       msg: "Missing Required Parameters",
//     });
//   }

//   try {
//     // Step 1: Check if driver exists
//     const [driverRows] = await db.query(
//       "SELECT id, driver_device_id FROM drivers WHERE driver_mobile = ?",
//       [driver_mobile]
//     );

//     if (driverRows.length === 0) {
//       return res.status(404).json({
//         status: false,
//         error: 1,
//         success: 0,
//         msg: "Sign Up First",
//       });
//     }

//     const dbDriverDeviceId = driverRows[0].driver_device_id;

//     if (dbDriverDeviceId !== driver_device_id) {
//       return res.status(401).json({
//         status: false,
//         error: 1,
//         success: 0,
//         msg: "Device ID mismatch. Please login from the registered device.",
//       });
//     }

//     const driverId = driverRows[0].id;

//     // Step 2: Send OTP via 2Factor API
//     const apiKey = process.env.TWO_FACTOR_API_KEY;
//     const otpApiUrl = `https://2factor.in/API/V1/${apiKey}/SMS/${driver_mobile}/${otp}/OTP_LOGIN`;
//     const response = await axios.get(otpApiUrl);

//     if (response.data.Status !== "Success") {
//       return res.status(500).json({
//         status: false,
//         error: 1,
//         success: 0,
//         msg: "OTP Sending Failed",
//       });
//     }

//     // Step 5: Insert login history
//     await db.query(
//       `INSERT INTO driver_login_history (driver_id, login_time, login_date, availability, driver_device_id, latitude, longitude, driver_otp)
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         driverId,
//         login_time,
//         login_date,
//         1,
//         driver_device_id,
//         driver_latitude || null,
//         driver_longitude || null,
//         otp,
//       ]
//     );

//     return res.json({
//       status: true,
//       error: 0,
//       success: 1,
//       msg: "OTP Sent Successfully",
//       otp,
//     });
//   } catch (error) {
//     console.error("OTP Error:", error);
//     return res
//       .status(500)
//       .json({ status: false, error: 1, success: 0, msg: "Server Error" });
//   }
// };

exports.driververifyOtp = async (req, res) => {
  try {
    const {
      driver_mobile,
      driver_otp,
      driver_device_id,
      driver_latitude,
      driver_longitude,
    } = req.body;

    const now = new Date();
    //
    const login_time = now.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const login_date = `${String(now.getDate()).padStart(2, "0")}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-${now.getFullYear()}`;

    if (!driver_mobile || !driver_otp) {
      return res.status(400).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Missing Required Parameters",
      });
    }

    const [otpResult] = await db.execute(
      `SELECT driver_otp FROM driver_login_history 
       WHERE driver_mobile = ? AND deleted = 0 
       ORDER BY id DESC LIMIT 1`,
      [driver_mobile]
    );

    if (otpResult.length === 0) {
      return res.status(404).json({
        status: false,
        error: 1,
        success: 0,
        msg: "OTP not found",
      });
    }

    const dbOtp = otpResult[0].driver_otp;

    if (String(driver_otp).trim() !== String(dbOtp).trim()) {
      return res.status(401).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Invalid OTP",
      });
    }

    // Mark OTP used
    await db.execute(
      `UPDATE driver_login_history 
       SET login_time = ?, login_date = ?, driver_device_id = ?, 
           driver_latitude = ?, driver_longitude = ?, deleted = 1 
       WHERE driver_mobile = ?`,
      [
        login_time,
        login_date,
        driver_device_id || null,
        driver_latitude || null,
        driver_longitude || null,
        driver_mobile,
      ]
    );

    // Get driver details
    const [driverData] = await db.execute(
      `SELECT id, driver_device_token 
       FROM drivers 
       WHERE driver_mobile = ? AND driver_active_status = 1`,
      [driver_mobile]
    );

    return res.json({
      status: true,
      error: 0,
      success: 1,
      msg: "Successfully Verified",
      driver_data: driverData[0] || {},
    });
  } catch (err) {
    console.error("Error in verifyOtp:", err);
    return res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Server Error",
      detail: err.message,
    });
  }
};

exports.checkDevice = async (req, res) => {
  try {
    const { driverid, device_token } = req.body;

    if (!driverid || !device_token) {
      return res.status(400).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Missing parameter driverid, device_token",
      });
    }

    // Check if driver exists
    const [driverRows] = await db.execute(
      "SELECT * FROM drivers WHERE id = ?",
      [driverid]
    );

    if (driverRows.length === 0) {
      return res.status(404).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Invalid driverid",
      });
    }

    // Check if device token exists
    const [tokenRows] = await db.execute(
      "SELECT * FROM drivers WHERE driver_device_token = ?",
      [device_token]
    );

    if (tokenRows.length > 0) {
      return res.json({
        status: true,
        error: 0,
        success: 1,
        msg: "This device_token is login",
      });
    } else {
      return res.json({
        status: false,
        error: 1,
        success: 0,
        msg: "This device_token is not login",
      });
    }
  } catch (error) {
    console.error("checkDevice error:", error);
    return res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Server error",
      detail: error.message,
    });
  }
};

exports.getDriverStatus = async (req, res) => {
  try {
    const driverid = parseInt(req.body.driverid || req.query.driverid, 10);

    if (!driverid) {
      return res.status(400).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Missing Driverid",
      });
    }

    const [rows] = await db.execute(
      `SELECT driver_active_status, approved, reject_message, registeration_fee_status, 
              driver_district_id, driver_vehicle_type_id, driver_vehicle_name, service_id 
       FROM drivers 
       WHERE id = ?`,
      [driverid]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Driver not found",
      });
    }

    const driver = rows[0];

    if (parseInt(driver.registeration_fee_status) === 1) {
      return res.json({
        status: true,
        error: 0,
        success: 1,
        msg: "Approved",
        desc_msg: "Registeration Fee Paid",
      });
    } else {
      return res.json({
        status: true,
        error: 0,
        success: 1,
        msg: "Registeration_Pending",
        desc_msg: "Registration Not Paid",
      });
    }
  } catch (error) {
    console.error("getDriverStatus error:", error);
    return res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Server error",
      detail: error.message,
    });
  }
};

exports.getIntercityDriverProfile = async (req, res) => {
  const driverid = parseInt(req.body.driverid || req.query.driverid || 0);

  if (!driverid || isNaN(driverid)) {
    return res.status(400).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Missing or invalid driverid",
    });
  }

  try {
    // Check if driver exists and is active
    const [exists] = await db.execute(
      "SELECT id FROM drivers WHERE id = ? AND driver_active_status = 1",
      [driverid]
    );
    if (exists.length === 0) {
      return res.json({
        status: false,
        error: 1,
        success: 0,
        msg: "Invalid driverid",
      });
    }

    // Get driver profile with onboarding fee data
    const [driverRows] = await db.execute(
      `
      SELECT d.*, 
             dof.vehicle_type_registration_fee, 
             dof.vehicle_type_minimum_earning, 
             dof.offer_reg_fee, 
             dof.offer_reg_fee_start_dt, 
             dof.offer_reg_fee_end_dt, 
             dof.status AS offer_status 
      FROM drivers d 
      LEFT JOIN driver_onboarding_fees dof 
        ON d.driver_vehicle_type_id = dof.vehicle_id 
      WHERE d.id = ? AND d.driver_active_status = 1
    `,
      [driverid]
    );

    if (driverRows.length === 0) {
      return res.json({
        status: false,
        error: 1,
        success: 0,
        msg: "Driver data not found",
      });
    }

    const driver = driverRows[0];

    // Pending rides count
    const [pendingRideRows] = await db.execute(
      'SELECT COUNT(id) AS total FROM booking_ride WHERE driver_id = ? AND trip_status = "pending"',
      [driverid]
    );
    driver.total_driver_rides = pendingRideRows[0]?.total || 0;

    // Cancellation charges
    const [cancelRows] = await db.execute(
      "SELECT cancelationCharges FROM site_setting WHERE id = 1"
    );
    driver.cancellation_charges = cancelRows[0]?.cancelationCharges || 0;

    // Total earning
    const [earningRows] = await db.execute(
      `
      SELECT IFNULL(SUM(CASE WHEN trip_status = 'completed' THEN amount ELSE 0 END), 0) AS total_earning 
      FROM booking_ride WHERE driver_id = ?
    `,
      [driverid]
    );
    const totalEarning = parseFloat(earningRows[0].total_earning || 0);
    driver.total_earning = totalEarning;

    // Plan expiration status
    const minEarning = parseFloat(driver.vehicle_type_minimum_earning || 0);
    driver.plan_expire_status =
      totalEarning >= minEarning ? driver.plan_expire_status : "0";

    // Remaining plan days
    const planDate = driver.plan_date;
    const validityDays = parseInt(driver.days || 0);
    const expireDate = new Date(
      new Date(planDate).getTime() + validityDays * 24 * 60 * 60 * 1000
    );
    const currentDate = new Date();
    const remainingDays =
      expireDate > currentDate
        ? Math.ceil((expireDate - currentDate) / (1000 * 60 * 60 * 24))
        : 0;
    driver.remaining_days = remainingDays;

    // Average rating
    const [ratings] = await db.execute(
      "SELECT rating FROM driver_rating WHERE driverid = ?",
      [driverid]
    );
    if (ratings.length > 0) {
      const totalRating = ratings.reduce(
        (sum, r) => sum + parseFloat(r.rating),
        0
      );
      const avgRating = totalRating / ratings.length;
      driver.rating = avgRating.toFixed(2);
    } else {
      driver.rating = "0";
    }

    res.json({
      status: true,
      error: 0,
      success: 1,
      msg: "Successfully loaded data",
      driver_data: driver,
    });
  } catch (error) {
    console.error("getDriverProfile Error:", error);
    res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Server error",
      detail: error.message,
    });
  }
};

exports.driver_earning_amount = async (req, res) => {
  const driverid = req.body.driverid;

  if (driverid) {
    const [checkRows] = await db.query(
      "SELECT id,driver_vehicle_type_id FROM drivers WHERE id = ? and driver_active_status=1",
      [driverid]
    );

    if (checkRows.length > 0) {
      const check = checkRows[0];
      const [[sql]] = await db.query(
        "SELECT plan_date,days FROM drivers WHERE id=?",
        [driverid]
      );

      const [[sqltotal_earning]] = await db.query(
        "SELECT IFNULL(SUM(CASE WHEN trip_status = 'completed' THEN amount ELSE 0 END), 0) as total_earning FROM booking_ride WHERE driver_id=?",
        [driverid]
      );

      const [[sqltotal_rides]] = await db.query(
        "SELECT COUNT(CASE WHEN trip_status = 'completed' THEN id ELSE NULL END) as total_rides FROM booking_ride WHERE driver_id=?",
        [driverid]
      );

      const [[sqltoday_total_earning]] = await db.query(
        "SELECT IFNULL(SUM(CASE WHEN DATE(dt) = CURDATE() AND trip_status = 'completed' THEN amount ELSE 0 END), 0) as today_total_earning FROM booking_ride WHERE driver_id=?",
        [driverid]
      );

      const [[sqltoday_total_rides]] = await db.query(
        "SELECT IFNULL(SUM(CASE WHEN DATE(dt) = CURDATE() AND trip_status = 'completed' THEN 1 ELSE 0 END), 0) as today_total_rides FROM booking_ride WHERE driver_id=?",
        [driverid]
      );

      const driver_vehicle_type_id = check.driver_vehicle_type_id;

      const [[onbordinedeesdata]] = await db.query(
        "SELECT vehicle_type_minimum_earning FROM driver_onboarding_fees WHERE vehicle_id = ?",
        [driver_vehicle_type_id]
      );
      const minimumeraning = onbordinedeesdata.vehicle_type_minimum_earning;

      const [[getgstdata]] = await db.query(
        "SELECT total_gst_paid,gst_total_amount FROM drivers WHERE id = ?",
        [driverid]
      );

      const gst_percentage = 6;
      const gst_amount = getgstdata.gst_total_amount;
      const total_before_gst = (gst_amount * 100) / gst_percentage;

      const total_gstpaid = getgstdata.total_gst_paid;

      if (parseFloat(total_gstpaid) > 0.0) {
        sql.Earning = sqltotal_earning.total_earning - total_before_gst;
        const gst_to_be_paid = (gst_percentage / 100) * sql.Earning;
        sql.totalEarning = sqltotal_earning.total_earning;
        var gst_to_be_paid_final = gst_to_be_paid;
      } else {
        sql.Earning = Math.round(total_before_gst);
        sql.totalEarning = sqltotal_earning.total_earning;
        const gst_to_be_paid =
          (gst_percentage / 100) * (sql.totalEarning - sql.Earning);
        var gst_to_be_paid_final = parseFloat(gst_to_be_paid.toFixed(2));
      }

      sql.earning_limit = minimumeraning - sql.totalEarning;

      if (sql.earning_limit <= 0) {
        await db.query(
          "UPDATE drivers SET registeration_fee_status = '0' WHERE id = ?",
          [driverid]
        );
      }

      sql.total_rides = sqltotal_rides.total_rides;
      sql.today_total_rides = sqltoday_total_rides.today_total_rides;

      await db.query("UPDATE drivers SET total_gst_paid = ? WHERE id = ?", [
        gst_to_be_paid_final,
        driverid,
      ]);

      const gst_due_details = {
        gst_needToPay: parseFloat(gst_to_be_paid_final || 0),
      };

      const plan_date = sql.plan_date;
      const validity_days = sql.days;
      const current_date = new Date();
      const expire_date = new Date(plan_date);
      expire_date.setDate(expire_date.getDate() + parseInt(validity_days));

      const remaining_days =
        expire_date > current_date
          ? Math.floor(
              (expire_date.getTime() - current_date.getTime()) /
                (1000 * 3600 * 24)
            )
          : 0;

      sql.remaining_days = remaining_days;
      sql.gst_due_details = gst_due_details;

      return res.json({
        status: true,
        error: 0,
        success: 1,
        msg: "loaded Successfully",
        result: sql,
      });
    } else {
      return res.json({
        status: false,
        error: 1,
        success: 0,
        msg: "Invalid Driver ID. \nPlease contact support to resolve this issue.",
      });
    }
  } else {
    return res.json({
      status: false,
      error: 1,
      success: 0,
      msg: "missing driverid",
    });
  }
};

// exports.getDriverDashboard = async (req, res) => {
//   const driverid = parseInt(req.body.driverid || req.query.driverid || 0);

//   if (!driverid || isNaN(driverid)) {
//     return res
//       .status(400)
//       .json({ status: false, error: 1, success: 0, msg: "Missing driverid" });
//   }

//   try {
//     const [check] = await db.execute(
//       "SELECT id FROM drivers WHERE id = ? AND driver_active_status = 1",
//       [driverid]
//     );

//     if (check.length === 0) {
//       return res.json({
//         status: false,
//         error: 1,
//         success: 0,
//         msg: "Invalid Driver ID. Please contact support to resolve this issue.",
//       });
//     }

//     // Get driver basic info
//     const [driverRows] = await db.execute(
//       `
//       SELECT username, driver_full_name, driver_photo, driver_address, driver_availability,
//              plan_date, days, balance AS driver_wallet, driver_email, driver_mobile, total_gst_paid
//       FROM drivers WHERE id = ?
//     `,
//       [driverid]
//     );

//     const driver = driverRows[0];

//     // Get total earning
//     const [earningRow] = await db.execute(
//       `
//       SELECT IFNULL(SUM(CASE WHEN trip_status = 'completed' THEN amount ELSE 0 END), 0) AS total_earning
//       FROM booking_ride WHERE driver_id = ?
//     `,
//       [driverid]
//     );
//     driver.total_earning = parseFloat(earningRow[0].total_earning || 0);

//     // Total rides
//     const [rideRow] = await db.execute(
//       `
//       SELECT COUNT(CASE WHEN trip_status = 'completed' THEN id ELSE NULL END) AS total_rides
//       FROM booking_ride WHERE driver_id = ?
//     `,
//       [driverid]
//     );
//     driver.total_rides = rideRow[0].total_rides || 0;

//     // Today's total earning
//     const [todayEarningRow] = await db.execute(
//       `
//       SELECT IFNULL(SUM(CASE WHEN DATE(dt) = CURDATE() AND trip_status = 'completed' THEN amount ELSE 0 END), 0) AS today_total_earning
//       FROM booking_ride WHERE driverid = ?
//     `,
//       [driverid]
//     );
//     driver.today_total_earning = parseFloat(
//       todayEarningRow[0].today_total_earning || 0
//     );

//     // Today's total rides
//     const [todayRideRow] = await db.execute(
//       `
//       SELECT IFNULL(SUM(CASE WHEN DATE(dt) = CURDATE() AND trip_status = 'completed' THEN 1 ELSE 0 END), 0) AS today_total_rides
//       FROM booking_ride WHERE driverid = ?
//     `,
//       [driverid]
//     );
//     driver.today_total_rides = todayRideRow[0].today_total_rides || 0;

//     // GST due calculation
//     const percentage = 6;
//     const totalGSTPaid = parseFloat(driver.total_gst_paid || 0);
//     const gstDueAmt = Math.max(
//       (percentage / 100) * driver.total_earning - totalGSTPaid,
//       0.1
//     );

//     driver.gst_due_details = {
//       gst_due_amt: gstDueAmt,
//       driver_email: driver.driver_email,
//       driver_mobile: driver.driver_mobile,
//     };

//     // Remaining days calculation
//     const planDate = new Date(driver.plan_date);
//     const validityDays = parseInt(driver.days || 0);
//     const expireDate = new Date(
//       planDate.getTime() + validityDays * 24 * 60 * 60 * 1000
//     );
//     const now = new Date();
//     const remainingDays =
//       expireDate > now
//         ? Math.ceil((expireDate - now) / (1000 * 60 * 60 * 24))
//         : 0;
//     driver.remaining_days = remainingDays;

//     // Recently completed rides (limit 5)
//     const [recentRides] = await db.execute(
//       `
//       SELECT u.username, b.pickup_add, b.drop_add, b.distance, b.amount, b.trip_status, b.dt
//       FROM booking_ride b
//       LEFT JOIN users u ON b.user_id = u.id
//       WHERE b.driver_id = ? AND b.trip_status = 'completed'
//       ORDER BY b.id DESC
//       LIMIT 5
//     `,
//       [driverid]
//     );
//     driver.recentlyCompletedRides = recentRides;

//     // Final response
//     return res.json({
//       status: true,
//       error: 0,
//       success: 1,
//       msg: "loaded Successfully",
//       result: driver,
//     });
//   } catch (err) {
//     console.error("getDriverDashboard error:", err);
//     return res.status(500).json({
//       status: false,
//       error: 1,
//       success: 0,
//       msg: "Server error",
//       detail: err.message,
//     });
//   }
// };

// ====================================================================================
// ====================================================================================
// =========================== END LIVE API FOR THE JEEYORIDE =========================
// ====================================================================================
// ====================================================================================

exports.getAllDrivers = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM drivers");
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching drivers:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.driverAvailableStatus = async (req, res) => {
  const { driverid } = req.body;

  const now = new Date();
  const login_time = now.toLocaleTimeString("en-GB", { hour12: false }); // HH:mm:ss
  const login_date = now.toISOString().split("T")[0]; // YYYY-MM-DD

  if (!driverid) {
    return res.json({
      status: false,
      error: true,
      success: false,
      msg: "Missing driverid",
    });
  }

  try {
    // 1️⃣ Check if driver exists
    const [driverRows] = await db.query(
      "SELECT id, driver_availability FROM drivers WHERE id = ?",
      [driverid]
    );

    if (driverRows.length === 0) {
      return res.json({
        status: false,
        error: true,
        success: false,
        msg: "Invalid driverid",
      });
    }

    const availability = driverRows[0].driver_availability ?? null;

    if (availability === null || availability === undefined) {
      return res.json({
        status: false,
        error: true,
        success: false,
        msg: "Missing availability",
      });
    }

    // 2️⃣ Update driver availability
    const [updateResult] = await db.query(
      "UPDATE drivers SET driver_availability = ? WHERE id = ?",
      [availability, driverid]
    );

    if (updateResult.affectedRows === 0) {
      return res.json({
        status: false,
        error: true,
        success: false,
        msg: "Failed to update availability",
      });
    }

    // 3️⃣ Insert into driver_availability_history
    await db.query(
      `INSERT INTO driver_availability_history 
       (driver_id, availability, status, availability_date, availability_time) 
       VALUES (?, ?, ?, ?, ?)`,
      [driverid, availability, 1, login_date, login_time]
    );

    // ✅ Success Response
    return res.json({
      status: true,
      error: false,
      success: true,
      msg: "Successfully updated",
      availability_status: availability == 1 ? true : false,
    });
  } catch (err) {
    console.error("driverAvailableStatus error:", err);
    return res.json({
      status: false,
      error: true,
      success: false,
      msg: "Internal Server Error",
    });
  }
};

exports.driverAvailable = async (req, res) => {
  const { driverid, availability } = req.body;

  const now = new Date();
  const login_time = now.toLocaleTimeString("en-GB", { hour12: false }); // HH:mm:ss
  const login_date = now.toISOString().split("T")[0]; // YYYY-MM-DD

  // Check for missing driverid
  if (!driverid) {
    return res.json({
      status: false,
      error: true,
      success: false,
      msg: "Missing driverid",
    });
  }

  try {
    // 1️⃣ Check if driver exists
    const [driverRows] = await db.query("SELECT id FROM drivers WHERE id = ?", [
      driverid,
    ]);

    if (driverRows.length === 0) {
      return res.json({
        status: false,
        error: true,
        success: false,
        msg: "Invalid driverid",
      });
    }

    // 2️⃣ Validate availability
    if (availability === undefined || availability === null) {
      return res.json({
        status: false,
        error: true,
        success: false,
        msg: "Missing availability",
      });
    }

    // 3️⃣ Update availability
    const [updateResult] = await db.query(
      "UPDATE drivers SET driver_availability = ? WHERE id = ?",
      [availability, driverid]
    );

    if (updateResult.affectedRows === 0) {
      return res.json({
        status: false,
        error: true,
        success: false,
        msg: "Failed to update availability",
      });
    }

    // 4️⃣ Insert availability history
    await db.query(
      `INSERT INTO driver_availability_history 
       (driver_id, availability, status, availability_date, availability_time)
       VALUES (?, ?, ?, ?, ?)`,
      [driverid, availability, 1, login_date, login_time]
    );

    // ✅ Success Response
    return res.json({
      status: true,
      error: false,
      success: true,
      msg: "Successfully updated",
      availability_status: availability == 1 ? true : false,
    });
  } catch (err) {
    console.error("driverAvailable error:", err);
    return res.json({
      status: false,
      error: true,
      success: false,
      msg: "Internal Server Error",
    });
  }
};

exports.acceptCancelStatus = async (req, res) => {
  const { ride_id, status } = req.body;

  if (!ride_id) {
    console.error("❌ Missing ride_id");
    return res.json({
      status: false,
      error: 1,
      success: 0,
      msg: "Missing ride_id",
    });
  }

  if (!status) {
    console.error("❌ Missing status");
    return res.json({
      status: false,
      error: 1,
      success: 0,
      msg: "Missing status",
    });
  }

  try {
    if (status === "accept") {
      // ✅ Check booking with current status
      const [bookingCheck] = await db.query(
        "SELECT id, driver_id FROM booking_ride WHERE ride_id = ? AND trip_status = ?",
        [ride_id, status]
      );

      if (bookingCheck.length === 0) {
        return res.json({
          status: false,
          error: 1,
          success: 0,
          msg: "Booking not found with given status",
        });
      }

      const driverid = bookingCheck[0].driver_id;

      // ✅ Get user_id and OTP
      const [bookingData] = await db.query(
        "SELECT user_id, otp FROM booking_ride WHERE ride_id = ? AND trip_status = ?",
        [ride_id, status]
      );

      const userid = bookingData[0].user_id;
      const getotp = bookingData[0].otp;

      // ✅ Update booking status
      await db.query(
        "UPDATE booking_ride SET trip_status = 'accepted' WHERE ride_id = ?",
        [ride_id]
      );

      // ✅ Send OneSignal Notification
      const appId = "74a59bde-55c3-4926-ad38-aeae62f88137";
      const apiKey = "MjgxNTcwY2ItMTQzNC00NjUwLTg1ZTQtMTJlZTIxMGE5MTk4";

      const [userDevice] = await db.query(
        "SELECT user_device_token FROM users WHERE id = ?",
        [userid]
      );
      const deviceToken = userDevice[0]?.user_device_token;

      if (deviceToken) {
        const notification = {
          app_id: appId,
          include_player_ids: [deviceToken],
          headings: { en: "Welcome to Jeeyo Ride - OTP" },
          contents: { en: getotp },
          ios_sound: "default",
          android_sound: "default",
          android_channel_id: "ce0fad4f-0f20-4d1f-9e73-098cab7a86fe",
          priority: 10,
        };

        await axios.post(
          "https://onesignal.com/api/v1/notifications",
          notification,
          {
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              Authorization: `Basic ${apiKey}`,
            },
          }
        );
      }

      return res.json({
        status: true,
        error: 0,
        success: 1,
        msg: "Accept Request Successfully",
      });
    } else {
      // ✅ Cancel or other status
      await db.query(
        "UPDATE booking_ride SET trip_status = ? WHERE ride_id = ?",
        [status, ride_id]
      );
      console.log(`✔ Booking updated: ride_id=${ride_id}, status=${status}`);

      return res.json({
        status: true,
        error: 0,
        success: 1,
        msg: `${
          status.charAt(0).toUpperCase() + status.slice(1)
        } Request Successfully`,
      });
    }
  } catch (error) {
    console.error("acceptCancelStatus Error:", error);
    return res.json({
      status: false,
      error: 1,
      success: 0,
      msg: "Internal Server Error",
    });
  }
};
//
// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
//

//

exports.driver_completed_trips = async (req, res) => {
  try {
    const driverid = req.query.driverid || req.body.driverid;

    if (!driverid) {
      return res.json({
        status: false,
        error: 1,
        success: 0,
        msg: "missing driverid",
      });
    }

    // Check driver existence and status=1
    const checkQuery = `SELECT id FROM drivers WHERE id = ? AND driver_active_status = 1`;
    const checkResult = await db.query(checkQuery, [driverid]);

    if (checkResult.length === 0) {
      return res.json({
        status: false,
        error: 1,
        success: 0,
        msg: "invalid driverid",
      });
    }

    // Get all booking rides for this driver
    const getDataQuery = `
      SELECT 
        b.id, b.user_id, u.username, u.user_mobile, u.image AS userimage, b.dt, b.pickup_add, b.drop_add, 
        b.amount, b.distance, b.trip_status, b.source_latitude, b.source_longitude, 
        b.destination_latitude, b.destination_longitude, b.total_time, b.driver_id,
        d.username AS driver_username, d.driver_full_name, d.driver_vehicle_number, d.driver_vehicle_model,
        d.vehicle_type_name
      FROM booking_ride b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN drivers d ON b.driver_id = d.id
      WHERE b.driverid = ?
      ORDER BY b.id DESC
    `;
    const getData = await db.query(getDataQuery, [driverid]);

    // Get total earning from completed trips
    const totalEarningQuery = `
      SELECT IFNULL(SUM(amount), 0) AS earning 
      FROM booking_ride 
      WHERE driverid = ? AND trip_status = 'completed'
    `;
    const totalEarningResult = await db.query(totalEarningQuery, [driverid]);
    const total_earning = totalEarningResult[0]?.earning || 0;

    if (getData.length > 0) {
      return res.json({
        status: true,
        error: 0,
        success: 1,
        msg: "Successfully loaded data",
        total_earning,
        data: getData,
      });
    } else {
      return res.json({
        status: false,
        error: 1,
        success: 0,
        msg: "Data not found",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Internal server error",
    });
  }
};

exports.updateDocumentId = async (req, res) => {
  const { driverid, document_id } = req.body;

  if (!driverid) {
    return res.json({
      status: false,
      error: 1,
      success: 0,
      msg: "missing driverid",
    });
  }

  try {
    const driverRows = await db.query(
      "SELECT id FROM drivers WHERE id = ? AND driver_active_status = 1",
      [driverid]
    );

    if (driverRows.length === 0) {
      return res.json({
        status: false,
        error: 1,
        success: 0,
        msg: "invalid driverid",
      });
    }

    if (!document_id) {
      return res.json({
        status: false,
        error: 1,
        success: 0,
        msg: "missing driver document id",
      });
    }

    await db.query("UPDATE drivers SET driver_document_id = ? WHERE id = ?", [
      document_id,
      driverid,
    ]);

    return res.json({
      status: true,
      error: 0,
      success: 1,
      msg: "Update Successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      error: 1,
      msg: "Server error",
      details: error.message,
    });
  }
};

exports.checkPlanValidity = async (req, res) => {
  try {
    const { driverid } = req.body;

    if (!driverid) {
      return res.status(400).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Missing required params",
      });
    }

    // Check if driver exists
    const [driverCheck] = await db.query(
      "SELECT id FROM drivers WHERE id = ?",
      [driverid]
    );
    if (driverCheck.length === 0) {
      return res.status(404).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Invalid driverid",
      });
    }

    // Get driver full info
    const [driverResult] = await db.query(
      "SELECT * FROM drivers WHERE id = ?",
      [driverid]
    );
    const driver = driverResult[0];

    const driverVehicleTypeId = driver.driver_vehicle_type_id;

    // Get minimum earning required
    const [minEarningResult] = await db.query(
      `SELECT dof.vehicle_type_minimum_earning FROM drivers d 
     JOIN driver_onboarding_fees dof 
     ON d.driver_vehicle_type_id = dof.vehicle_id
     WHERE d.id = ?`,
      [driverVehicleTypeId]
    );

    const minEarning =
      minEarningResult.length > 0
        ? parseFloat(minEarningResult[0].vehicle_type_minimum_earning)
        : 0;

    // Get driver's total completed earnings
    const [totalEarningResult] = await db.query(
      `
      SELECT IFNULL(SUM(CASE WHEN trip_status = 'completed' THEN amount ELSE 0 END), 0) as total_earning 
      FROM booking_ride 
      WHERE driver_id = ?
    `,
      [driverid]
    );

    const totalEarning = parseFloat(totalEarningResult[0].total_earning);

    if (totalEarning >= minEarning) {
      // Check if plan is not expired
      const [planCheck] = await db.query(
        "SELECT id FROM drivers WHERE id = ? AND plan_expire_status = 0",
        [driverid]
      );
      if (planCheck.length > 0) {
        return res.json({
          status: true,
          error: 0,
          success: 1,
          msg: "Plan validity is not expired",
        });
      } else {
        return res.json({
          status: false,
          error: 1,
          success: 0,
          msg: "Plan is expired",
        });
      }
    } else {
      // Earnings are less than minimum, but plan still valid
      return res.json({
        status: true,
        error: 0,
        success: 1,
        msg: "Plan validity is not expired",
      });
    }
  } catch (error) {
    console.error("Error in checkPlanValidity:", error);
    return res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Server error",
    });
  }
};

exports.updateExpiredPlans = async (req, res) => {
  try {
    const currentDate = new Date();

    // Fetch all drivers with active plans
    const [drivers] = await db.query(`
      SELECT id, plan_date, days 
      FROM drivers 
      WHERE driver_active_status = 1
    `);

    if (drivers.length === 0) {
      return res.json({
        status: false,
        error: 1,
        success: 0,
        msg: "No drivers found",
      });
    }

    for (const driver of drivers) {
      const { id, plan_date, days } = driver;

      if (!plan_date || !days) continue;

      const planDate = new Date(plan_date);
      const expirationDate = new Date(
        planDate.getTime() + days * 24 * 60 * 60 * 1000
      ); // days to ms

      if (currentDate > expirationDate) {
        await db.query(
          "UPDATE drivers SET plan_expire_status = 1 WHERE id = ?",
          [id]
        );
      }
    }

    return res.json({
      status: true,
      error: 0,
      success: 1,
      msg: "Successfully updated expired plans",
    });
  } catch (error) {
    console.error("Error in updateExpiredPlans:", error);
    return res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Server error",
    });
  }
};

exports.getRating = async (req, res) => {
  try {
    const { driverid } = req.body;

    if (!driverid) {
      return res.status(400).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Missing parameter driverid",
      });
    }

    // Check if driver exists and is active
    const [driverCheck] = await db.query(
      "SELECT id FROM drivers WHERE id = ? AND status = 1",
      [driverid]
    );

    if (driverCheck.length === 0) {
      return res.status(404).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Invalid driverid",
      });
    }

    // Fetch driver ratings with driver details
    const [ratings] = await db.query(
      `
      SELECT 
        r.*, 
        d.id AS driverid, 
        d.driver_full_name, 
        d.driver_photo 
      FROM driver_rating r
      LEFT JOIN drivers d ON r.driverid = d.id
      WHERE r.driverid = ?
    `,
      [driverid]
    );

    if (ratings.length > 0) {
      return res.json({
        status: true,
        error: 0,
        success: 1,
        msg: "Loaded Successfully",
        data: ratings,
      });
    } else {
      return res.json({
        status: false,
        error: 1,
        success: 0,
        msg: "No data found",
      });
    }
  } catch (error) {
    console.error("Error in getRating:", error);
    return res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Server error",
    });
  }
};

//

// ✅ Send SMS Function
const sendRegistrationSuccessfullMsg = async (driverDetails) => {
  const dusername = "JEEYOD" + String(driverDetails.id).padStart(4, "0");
  const msg = `Your Jeeyoride Driver ID, username='${dusername}' is created successfully. Welcome to Jeeyoride Zero Commission Direct Payment`;

  const postData = {
    module: "TRANS_SMS",
    apikey: "dc22dd14-24c5-11ef-8b60-0200cd936042",
    to: driverDetails.driver_mobile,
    from: "LOGINR",
    msg: msg,
  };

  try {
    const response = await axios.post(
      "https://2factor.in/API/R1/",
      new URLSearchParams(postData)
    );
    console.log("SMS sent successfully:", response.data);
  } catch (error) {
    console.error("SMS sending failed:", error.response?.data || error.message);
  }
};
//
exports.updateRegistrationFeeStatus = async (req, res) => {
  const { driverid } = req.body;

  if (!driverid) {
    return res.json({
      status: false,
      error: 1,
      success: 0,
      msg: "Missing required params",
    });
  }

  try {
    const [driverRows] = await db.query(
      "SELECT id, driver_mobile FROM drivers WHERE id = ?",
      [driverid]
    );

    if (driverRows.length === 0) {
      return res.json({
        status: false,
        error: 1,
        success: 0,
        msg: "Invalid driverid",
      });
    }

    const driverDetails = driverRows[0];

    const [updateResult] = await db.query(
      "UPDATE drivers SET registeration_fee_status = 1 WHERE id = ?",
      [driverid]
    );

    if (updateResult.affectedRows > 0) {
      await sendRegistrationSuccessfullMsg(driverDetails);

      return res.json({
        status: true,
        error: 0,
        success: 1,
        msg: "Registration Fee Paid Successfully",
      });
    } else {
      return res.json({
        status: false,
        error: 1,
        success: 0,
        msg: "Failed to update status",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Server Error",
    });
  }
};

//

exports.logoutDriver = async (req, res) => {
  const driverId = req.body.driver_id;

  if (!driverId) {
    return res.json({
      status: false,
      error: 1,
      success: 0,
      msg: "Missing parameter driver id",
    });
  }

  try {
    const [rows] = await db.query("SELECT * FROM drivers WHERE id = ?", [
      driverId,
    ]);

    if (rows.length === 0) {
      return res.json({
        status: false,
        error: 1,
        success: 0,
        msg: "Driver not found",
      });
    }

    await db.query(
      "UPDATE drivers SET driver_push_subscription_id = '', driver_availability = 0 WHERE id = ?",
      [driverId]
    );

    return res.json({
      status: true,
      error: 0,
      success: 1,
      msg: "Logout Successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Server error",
    });
  }
};

//  GST Clearance
exports.gstClearance = async (req, res) => {
  const driverId = req.body.driverid;
  const gstPaid = parseFloat(req.body.total_gst_paid || 0);

  if (!driverId) {
    return res.json({
      status: false,
      error: 1,
      success: 0,
      msg: "Missing driverid",
    });
  }

  try {
    const [rows] = await db.query(
      "SELECT total_gst_paid FROM drivers WHERE id = ?",
      [driverId]
    );

    if (rows.length === 0) {
      return res.json({
        status: false,
        error: 1,
        success: 0,
        msg: "Driver not found",
      });
    }

    const updatedGst = parseFloat(rows[0].total_gst_paid || 0) + gstPaid;

    await db.query("UPDATE drivers SET total_gst_paid = ? WHERE id = ?", [
      updatedGst,
      driverId,
    ]);

    return res.json({
      status: true,
      error: 0,
      success: 1,
      msg: "Gst Payment Clearance Successful",
    });
  } catch (error) {
    console.error("GST Clearance Error:", error);
    return res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Server error",
    });
  }
};

//

// exports.finalget_other_charges = async (req, res) => {
//   const ride_id = req.body.bookingId || req.query.bookingId;
//   const driverid = req.body.driverid || req.query.driverid;

//   if (!ride_id) {
//     return res.json({ status: false, msg: "Ride ID is missing." });
//   }

//   try {
//     // Update driver ID in booking
//     await db.query("UPDATE booking_ride SET driver_id = ? WHERE ride_id = ?", [
//       driverid,
//       ride_id,
//     ]);

//     // Fetch ride data
//     const [rideRows] = await db.query(
//       "SELECT id AS bookId, driver_id, dt, distance, amount FROM booking_ride WHERE ride_id = ?",
//       [ride_id]
//     );
//     const ride = rideRows[0];
//     if (!ride) {
//       return res.json({ status: false, msg: "Ride not found." });
//     }

//     const { dt: datetime, distance: total_distance, amount, bookId } = ride;
//     const gstRate = 6;
//     const gst = (amount * gstRate) / (100 + gstRate);
//     const gst_amount = Math.round(gst * 100) / 100;
//     const sub_total = amount - gst_amount;

//     // Get driver details
//     const [driverRows] = await db.query(
//       "SELECT driver_vehicle_type_id, driver_district_id, driver_full_name, driver_mobile, driver_vehicle_number, driver_email FROM drivers WHERE id = ?",
//       [driverid]
//     );
//     const driver = driverRows[0];
//     if (!driver) {
//       return res.json({ status: false, msg: "Driver not found." });
//     }

//     const {
//       driver_vehicle_type_id,
//       driver_district_id,
//       driver_full_name: drivername,
//       driver_email,
//       driver_mobile,
//       driver_vehicle_number,
//     } = driver;

//     // Get fare details
//     const [fareRows] = await db.query(
//       `SELECT f.*, d.district_name AS city_name, v.vehicle_type_name
//        FROM fares f
//        LEFT JOIN districts d ON d.id = f.district_id
//        LEFT JOIN vehicle v ON f.vehicle_type_id = v.id
//        WHERE f.district_id = ? AND v.id = ?
//        ORDER BY f.id DESC LIMIT 1`,
//       [driver_district_id, driver_vehicle_type_id]
//     );
//     const fare = fareRows[0];
//     if (!fare) {
//       return res.json({ status: false, msg: "Fare data not found." });
//     }

//     const {
//       vehicle_type_name,
//       day_min_charge,
//       night_min_charge,
//       day_charge,
//       night_charge,
//       waiting_charge,
//       traffic_charge,
//       min_km,
//     } = fare;

//     const distance = total_distance > min_km ? total_distance - min_km : 0;

//     // Get time settings
//     const [siteSettings] = await db.query(
//       "SELECT start_night_time, end_night_time, pickup_Charges_Auto, PickUp_Charges_Cab, night_pickup_Charges_Auto, night_PickUp_Charges_Cab FROM site_setting WHERE id = 1"
//     );
//     const site = siteSettings[0];
//     if (!site) {
//       return res.json({ status: false, msg: "Site time settings not found." });
//     }

//     const currentTime = new Date().toLocaleTimeString("en-GB", {
//       hour: "2-digit",
//       minute: "2-digit",
//       hour12: false,
//     });

//     const isDay =
//       currentTime >= site.end_night_time &&
//       currentTime <= site.start_night_time;

//     let pickup_charges = 0;
//     if (isDay) {
//       pickup_charges =
//         driver_vehicle_type_id === 1
//           ? site.pickup_Charges_Auto
//           : [2, 3, 4, 5].includes(driver_vehicle_type_id)
//           ? site.PickUp_Charges_Cab
//           : 0;
//     } else {
//       pickup_charges =
//         driver_vehicle_type_id === 1
//           ? site.night_pickup_Charges_Auto
//           : [2, 3, 4, 5].includes(driver_vehicle_type_id)
//           ? site.night_PickUp_Charges_Cab
//           : 0;
//     }

//     const get_Booking_rides = {
//       period: isDay ? "day" : "night",
//       dayEnd: site.start_night_time,
//       dayStart: site.end_night_time,
//       min_km,
//       pickup_charges,
//       minimum_fare: isDay ? day_min_charge : night_min_charge,
//       rate_per_km: isDay ? day_charge : night_charge,
//       waiting_charges: waiting_charge,
//       traffic_charges: traffic_charge,
//       amount,
//       driver_name: drivername,
//       driver_email,
//       driver_mobile,
//       vehicle_no: driver_vehicle_number,
//       distance,
//       total_distance,
//       booking_id: bookId,
//       gst: gst_amount,
//       sub_total,
//     };

//     return res.json({
//       status: true,
//       error: 0,
//       success: 1,
//       msg: "Invoice Generated Successfully",
//       get_Booking_rides,
//     });
//   } catch (err) {
//     console.error("Error in getFinalOtherCharges:", err);
//     return res.status(500).json({
//       status: false,
//       msg: "Server error",
//     });
//   }
// };

// exports.finalget_other_charges = async (req, res) => {
//   const bookingId = req.query.bookingId || req.body.bookingId;

//   if (!bookingId) {
//     return res.json({ status: false, msg: "Booking ID is missing." });
//   }

//   try {
//     const [bookingDataRows] = await db.execute(
//       `
//       SELECT driver_id, dt, distance, amount
//       FROM booking_ride
//       WHERE ride_id = ?`,
//       [bookingId]
//     );

//     if (bookingDataRows.length === 0) {
//       return res.json({ status: false, msg: "Booking ride not found." });
//     }

//     const bookingData = bookingDataRows[0];
//     const {
//       driver_id,
//       dt: datetime,
//       distance: total_distance,
//       amount,
//     } = bookingData;

//     const [driverRows] = await db.execute(
//       `
//       SELECT driver_vehicle_type_id, driver_district_id, driver_full_name,
//              driver_mobile, driver_vehicle_number, driver_email
//       FROM drivers
//       WHERE id = ?`,
//       [driver_id]
//     );

//     if (driverRows.length === 0) {
//       return res.json({ status: false, msg: "Driver not found." });
//     }

//     const driver = driverRows[0];

//     const [fareRows] = await db.execute(
//       `
//       SELECT f.*, d.district_name AS city_name, v.vehicle_type_name
//       FROM fares f
//       LEFT JOIN districts d ON d.id = f.district_id
//       LEFT JOIN vehicle v ON f.vehicle_type_id = v.id
//       WHERE f.district_id = ? AND v.id = ?
//       ORDER BY f.id DESC LIMIT 1
//     `,
//       [driver.driver_district_id, driver.driver_vehicle_type_id]
//     );

//     if (fareRows.length === 0) {
//       return res.json({ status: false, msg: "Fare data not found." });
//     }

//     const fare = fareRows[0];

//     const distance =
//       total_distance > fare.min_km ? total_distance - fare.min_km : 0;

//     const [settingRow] = await db.execute(
//       "SELECT start_night_time, end_night_time, pickup_Charges_Auto, PickUp_Charges_Cab, night_pickup_Charges_Auto, night_PickUp_Charges_Cab FROM site_setting WHERE id = 1"
//     );
//     if (settingRow.length === 0) {
//       return res.json({ status: false, msg: "Site time settings not found." });
//     }

//     const setting = settingRow[0];

//     const currentTime = new Date().toTimeString().substring(0, 5);
//     const isDay =
//       currentTime >= setting.end_night_time &&
//       currentTime <= setting.start_night_time;

//     let pickup_charges = 0;
//     if (isDay) {
//       if (driver.driver_vehicle_type_id === 15) {
//         pickup_charges = setting.pickup_Charges_Auto;
//       } else if ([2, 4, 47].includes(driver.driver_vehicle_type_id)) {
//         pickup_charges = setting.PickUp_Charges_Cab;
//       }
//     } else {
//       if (driver.driver_vehicle_type_id === 15) {
//         pickup_charges = setting.night_pickup_Charges_Auto;
//       } else if ([2, 4, 47].includes(driver.driver_vehicle_type_id)) {
//         pickup_charges = setting.night_PickUp_Charges_Cab;
//       }
//     }

//     const get_Booking_rides = {
//       period: isDay ? "day" : "night",
//       dayEnd: setting.start_night_time,
//       dayStart: setting.end_night_time,
//       min_km: fare.min_km,
//       pickup_charges: pickup_charges,
//       minimum_fare: isDay ? fare.day_min_charge : fare.night_min_charge,
//       rate_per_km: isDay ? fare.day_charge : fare.night_charge,
//       waiting_charges: fare.waiting_charge,
//       traffic_charges: fare.traffic_charge,
//       amount: amount,
//       driver_name: driver.driver_full_name,
//       driver_email: driver.driver_email,
//       driver_mobile: driver.driver_mobile,
//       vehicle_no: driver.driver_vehicle_number,
//       distance: distance,
//       total_distance: total_distance,
//     };

//     return res.json({
//       status: true,
//       error: 0,
//       success: 1,
//       msg: "Invoice Generated Successfully",
//       get_Booking_rides: get_Booking_rides,
//     });
//   } catch (err) {
//     console.error(err);
//     return res.json({ status: false, msg: "Server error", error: 1 });
//   }
// };

//

exports.ride_completed_user_invoice = async (req, res) => {
  const bookingId = req.body.booking_id;

  if (!bookingId)
    return res
      .status(400)
      .json({ success: false, msg: "booking_id is required" });

  try {
    // 1. Booking Info
    const [bookingRows] = await db.query(
      "SELECT * FROM booking_ride WHERE id = ?",
      [bookingId]
    );
    if (!bookingRows.length)
      return res.status(404).json({ success: false, msg: "Booking not found" });

    const booking = bookingRows[0];
    const { id, user_id, driver_id, amount, distance, pickup_add, drop_add } =
      booking;

    // 2. User Info
    const [userRows] = await db.query(
      "SELECT user_email, user_full_name FROM users WHERE id = ?",
      [user_id]
    );
    if (!userRows.length)
      return res.status(404).json({ success: false, msg: "User not found" });

    const user = userRows[0];

    // 3. Driver Info
    const [driverRows] = await db.query(
      "SELECT driver_full_name, driver_email, driver_mobile, driver_vehicle_type_name FROM drivers WHERE id = ?",
      [driver_id]
    );
    if (!driverRows.length)
      return res.status(404).json({ success: false, msg: "Driver not found" });

    const driver = driverRows[0];
    const driverEmail =
      driver.driver_email && driver.driver_email !== "Null"
        ? driver.driver_email
        : "-";

    // 4. Charges
    let charges =
      driver.driver_vehicle_type_name === "Auto" ? 10 + 1 + 1 : 20 + 1 + 1;
    const finalAmount = amount - charges;

    // 5. Generate Invoice HTML
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: 'Arial', sans-serif; }
    .invoicetable { width: 100%; border-collapse: collapse; }
    .invoicetable th, .invoicetable td {
        border: 1px solid #000; padding: 5px; text-align: center;
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <img src="https://jeeyoride.com/admin/images/invoicelogo.jpg" style="width:50px;height: 50px;" alt="Logo">
    <h2 style="text-align: center;">INVOICE</h2>
    <hr>
    <p>Company Name: Jeeyoride Pvt. Ltd.<br>
    Address: Office No-25 B Building 3rd Floor, City Vista, Pune-411014<br>
    GST No: AA270424133788W</p>
    <hr>
    <p><strong>Pick Up:</strong> ${pickup_add}</p>
    <p><strong>Drop:</strong> ${drop_add}</p>
    <hr>
    <h3>Billing To</h3>
    <p><strong>Name:</strong> ${driver.driver_full_name}</p>
    <p><strong>Mobile:</strong> ${driver.driver_mobile}</p>
    <p><strong>Email:</strong> ${driverEmail}</p>
    <table class="invoicetable">
      <tr><th>Description</th><th>Total Distance</th><th>Amount</th></tr>
      <tr><td>-</td><td>${distance}</td><td>Rs ${finalAmount}</td></tr>
      <tr><td>Waiting + Traffic + Pickup Charges</td><td>-</td><td>Rs ${charges}</td></tr>
      <tr><td>Total Amount</td><td>-</td><td>Rs ${amount}</td></tr>
    </table>
    <p><strong>Remarks:</strong><br>Your satisfaction is our top priority! Thank you for choosing JeeyoRide.</p>
  </div>
</body>
</html>`;

    // 6. Generate PDF
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfPath = path.join(__dirname, `invoice_${driver_id}.pdf`);
    await page.pdf({ path: pdfPath, format: "A4" });
    await browser.close();

    // 7. Send Email
    const transporter = nodemailer.createTransport({
      host: "bom1plzcpnl501944.prod.bom1.secureserver.net",
      port: 465,
      secure: true,
      auth: {
        user: "info@jeeyoride.com",
        pass: "ridejeeyo@2003",
      },
    });

    await transporter.sendMail({
      from: '"JeeyoRide" <info@jeeyoride.com>',
      to: user.user_email,
      subject: "Invoice",
      html: `Dear ${user.user_full_name},<br><br>Please find your invoice attached.<br><br>Best Regards,<br>JeeyoRide`,
      attachments: [
        {
          filename: `invoice_${driver_id}.pdf`,
          path: pdfPath,
        },
      ],
    });

    // 8. Cleanup
    fs.unlinkSync(pdfPath);

    res.json({ success: true, msg: "Email Sent with PDF Invoice!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      msg: "Error sending invoice",
      error: error.message,
    });
  }
};

exports.finalget_other_charges = async (req, res) => {
  const { bookingId: ride_id, driverid } = req.body;

  if (!ride_id) {
    return res.json({ status: false, msg: "Ride ID is missing." });
  }

  try {
    // ✅ Update booking with driver_id
    await db.query("UPDATE booking_ride SET driver_id = ? WHERE ride_id = ?", [
      driverid,
      ride_id,
    ]);

    // ✅ Fetch ride data
    const [rideData] = await db.query(
      "SELECT id as bookId, driver_id, dt, distance, amount FROM booking_ride WHERE ride_id = ?",
      [ride_id]
    );

    if (!rideData.length) {
      return res.json({ status: false, msg: "Ride not found." });
    }

    const { bookId, distance: total_distance, amount } = rideData[0];

    // ✅ GST Calculation (6%)
    const gstRate = 6;
    const gst_amount = parseFloat(
      ((amount * gstRate) / (100 + gstRate)).toFixed(2)
    );
    const sub_total = amount - gst_amount;

    // ✅ Get driver details
    const [driverData] = await db.query(
      `SELECT driver_vehicle_type_id, driver_district_id, driver_full_name, 
              driver_mobile, driver_vehicle_number, driver_email 
       FROM drivers WHERE id = ?`,
      [driverid]
    );

    if (!driverData.length) {
      return res.json({ status: false, msg: "Driver not found." });
    }

    const {
      driver_vehicle_type_id,
      driver_district_id,
      driver_full_name,
      driver_mobile,
      driver_vehicle_number,
      driver_email,
    } = driverData[0];

    // ✅ Fetch fare details
    const [fareData] = await db.query(
      `SELECT f.*, d.district_name AS city_name, v.vehicle_type_name
       FROM fares f 
       LEFT JOIN districts d ON d.id = f.district_id  
       LEFT JOIN vehicle v ON f.vehicle_type_id = v.id 
       WHERE f.district_id = ? AND v.id = ? 
       ORDER BY f.id DESC LIMIT 1`,
      [driver_district_id, driver_vehicle_type_id]
    );

    if (!fareData.length) {
      return res.json({ status: false, msg: "Fare data not found." });
    }

    const {
      vehicle_type_name,
      day_min_charge,
      night_min_charge,
      day_charge,
      night_charge,
      waiting_charge,
      traffic_charge,
      min_km,
    } = fareData[0];

    // ✅ Calculate extra distance
    const distance = total_distance > min_km ? total_distance - min_km : 0;

    // ✅ Get site settings (Day/Night Times)
    const [siteSettings] = await db.query(
      "SELECT * FROM site_setting WHERE id=1"
    );
    const { start_night_time: dayEnd, end_night_time: dayStart } =
      siteSettings[0];

    const currentTime = new Date().toTimeString().split(" ")[0].slice(0, 5); // HH:MM

    const isDay =
      new Date(`1970-01-01T${currentTime}:00Z`) >=
        new Date(`1970-01-01T${dayStart}:00Z`) &&
      new Date(`1970-01-01T${currentTime}:00Z`) <=
        new Date(`1970-01-01T${dayEnd}:00Z`);

    // ✅ Pickup Charges (Day/Night)
    let pickup_charges = 0;
    if (isDay) {
      pickup_charges =
        driver_vehicle_type_id == 1
          ? siteSettings[0].pickup_Charges_Auto
          : siteSettings[0].PickUp_Charges_Cab;
    } else {
      pickup_charges =
        driver_vehicle_type_id == 1
          ? siteSettings[0].night_pickup_Charges_Auto
          : siteSettings[0].night_PickUp_Charges_Cab;
    }

    // ✅ Prepare Invoice Data
    const get_Booking_rides = {
      period: isDay ? "day" : "night",
      dayEnd,
      dayStart,
      min_km,
      pickup_charges,
      minimum_fare: isDay ? day_min_charge : night_min_charge,
      rate_per_km: isDay ? day_charge : night_charge,
      waiting_charges: waiting_charge,
      traffic_charges: traffic_charge,
      amount,
      driver_name: driver_full_name,
      driver_email,
      driver_mobile,
      vehicle_no: driver_vehicle_number,
      distance,
      total_distance,
      booking_id: bookId,
      gst: gst_amount,
      sub_total,
    };

    return res.json({
      status: true,
      error: 0,
      success: 1,
      msg: "Invoice Generated Successfully",
      get_Booking_rides,
    });
  } catch (err) {
    console.error("finalGetOtherCharges Error:", err);
    return res.json({
      status: false,
      error: 1,
      success: 0,
      msg: "Internal Server Error",
    });
  }
};
