const db = require("../config/db_api");
require("dotenv").config();
const bcrypt = require("bcrypt");
const sharp = require("sharp");
const Joi = require("joi");
const fs = require("fs");
const path = require("path");
const axios = require("axios"); // Use for you can make HTTP requests easily.
const moment = require("moment");

const { logError } = require("../utils/logger");
const sendNotification = require("../utils/sendNotification");
const {
  getCityNameFromLatLong,
  convertCityToEnglish,
} = require("../utils/locationHelper");

// ====================================================================================
// ====================================================================================
// =========================== START LIVE API FOR THE JEEYORIDE =======================
// ====================================================================================
// ====================================================================================

exports.getOtherCharges = async (req, res) => {
  //
  const rideId = req.body.bookingRideId || req.query.bookingRideId;
  //
  if (!rideId) {
    return res.json({ status: false, msg: "Ride ID is missing." });
  }
  //
  try {
    const [rideDataRows] = await db.execute(
      "SELECT id AS bookId, driver_id, dt, distance, amount FROM booking_ride WHERE ride_id = ?",
      [rideId]
    );

    const ridedata = rideDataRows[0];
    if (!ridedata) {
      return res.json({ status: false, msg: "Ride not found." });
    }

    const [driverRows] = await db.execute(
      `SELECT driver_vehicle_type_id, driver_district_id, driver_full_name, 
              driver_mobile, driver_vehicle_number, driver_email 
       FROM drivers WHERE id = ?`,
      [ridedata.driver_id]
    );

    const driver = driverRows[0];
    if (!driver) {
      return res.json({ status: false, msg: "Driver not found." });
    }

    const [fareRows] = await db.execute(
      `SELECT f.*, d.district_name AS city_name, v.vehicle_type_name 
       FROM fares f
       LEFT JOIN districts d ON d.id = f.district_id
       LEFT JOIN vehicle v ON f.vehicle_type_id = v.id
       WHERE f.district_id = ? AND v.id = ?
       ORDER BY f.id DESC LIMIT 1`,
      [driver.driver_district_id, driver.driver_vehicle_type_id]
    );

    const fare = fareRows[0];
    if (!fare) {
      return res.json({ status: false, msg: "Fare data not found." });
    }

    const [settings] = await db.execute(
      "SELECT * FROM site_setting WHERE id = 1"
    );
    const site = settings[0];
    if (!site) {
      return res.json({ status: false, msg: "Site settings not found." });
    }

    const now = moment();
    const currentTime = now.format("HH:mm");
    const isDay =
      currentTime >= site.end_night_time &&
      currentTime <= site.start_night_time;

    const minKm = parseFloat(fare.min_km);
    const rideDistance = parseFloat(ridedata.distance);
    const distance = rideDistance > minKm ? rideDistance - minKm : 0;

    const pickup_charges = (() => {
      if (driver.driver_vehicle_type_id == 1) {
        return isDay
          ? site.pickup_Charges_Auto
          : site.night_pickup_Charges_Auto;
      } else if ([2, 3, 4, 5].includes(driver.driver_vehicle_type_id)) {
        return isDay ? site.PickUp_Charges_Cab : site.night_PickUp_Charges_Cab;
      }
      return 0;
    })();

    const get_Booking_rides = {
      period: isDay ? "day" : "night",
      dayEnd: site.start_night_time,
      dayStart: site.end_night_time,
      min_km: fare.min_km,
      pickup_charges,
      minimum_fare: isDay ? fare.day_min_charge : fare.night_min_charge,
      rate_per_km: isDay ? fare.day_charge : fare.night_charge,
      waiting_charges: fare.waiting_charge,
      traffic_charges: fare.traffic_charge,
      amount: ridedata.amount,
      driver_name: driver.driver_full_name,
      driver_email: driver.driver_email,
      driver_mobile: driver.driver_mobile,
      vehicle_no: driver.driver_vehicle_number,
      distance,
      total_distance: rideDistance,
      booking_id: ridedata.bookId,
    };

    res.json({
      status: true,
      error: 0,
      success: 1,
      msg: "Invoice Generated Successfully",
      get_Booking_rides,
    });
  } catch (error) {
    console.error("Error in getOtherCharges:", error);
    res.status(500).json({ status: false, msg: "Internal Server Error" });
  }
};

// exports.bookRide = async (req, res) => {
//   try {
//     const {
//       book_ride_id,
//       userid,
//       pickup_add,
//       drop_add,
//       vehicle_name,
//       vehicle_type_id,
//       generated_otp,
//       amount,
//       discount_amount_status,
//       discount_amount,
//       distance,
//       source_latitude,
//       source_longitude,
//       destination_latitude,
//       destination_longitude,
//       total_time,
//     } = req.body;

//     // Validate required fields
//     const required = {
//       book_ride_id,
//       userid,
//       pickup_add,
//       drop_add,
//       vehicle_name,
//       vehicle_type_id,
//       generated_otp,
//       amount,
//       distance,
//       source_latitude,
//       source_longitude,
//       destination_latitude,
//       destination_longitude,
//       total_time,
//     };
//     for (const key in required) {
//       if (!required[key]) {
//         return res.json({
//           status: false,
//           error: 1,
//           success: 0,
//           msg: `missing parameter ${key}`,
//         });
//       }
//     }

//     // Check valid, active user
//     const [userCheck] = await db.execute(
//       'SELECT id, user_frist_ride, user_reffer_count, user_reffer_count_use, user_cancellationCharges FROM users WHERE id = ? AND status = 1',
//       [userid]
//     );
//     if (userCheck.length === 0) {
//       return res.json({
//         status: false,
//         error: 1,
//         success: 0,
//         msg: 'invalid userid',
//       });
//     }
//     const user = userCheck[0];

//     // Insert booking
//     const date = moment().format('YYYY-MM-DD HH:mm:ss');
//     const [[kmRateRow]] = await db.execute(
//       'SELECT km_rate FROM site_setting WHERE id = 1'
//     );
//     const kmRate = kmRateRow.km_rate;

//     const [bookingRes] = await db.execute(
//       `
//       INSERT INTO booking_ride (user_id, driver_id, ride_id, otp, pickup_add, drop_add, distance, source_latitude, source_longitude, destination_latitude, destination_longitude, total_time, amount, payment_method, dt)
//       VALUES (?, '', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COD', ?)
//     `,
//       [
//         userid,
//         book_ride_id,
//         generated_otp,
//         pickup_add,
//         drop_add,
//         distance,
//         source_latitude,
//         source_longitude,
//         destination_latitude,
//         destination_longitude,
//         total_time,
//         amount,
//         date,
//       ]
//     );

//     if (!bookingRes.insertId) {
//       return res.json({
//         status: false,
//         error: 1,
//         success: 0,
//         msg: 'Something went wrong',
//       });
//     }

//     const bookid = bookingRes.insertId;

//     // Update first ride and referral count
//     await db.execute('UPDATE users SET user_frist_ride = 1 WHERE id = ?', [
//       userid,
//     ]);
//     if (+discount_amount_status === 1) {
//       await db.execute(
//         'UPDATE users SET user_reffer_count_use = 1 WHERE id = ?',
//         [userid]
//       );
//     }

//     //Insert OTP
//     await db.execute(
//       'INSERT INTO otp (otp, userid, bookid, dt) VALUES (?, ?, ?, ?)',
//       [generated_otp, userid, bookid, date]
//     );

//     // 6Fare & timing logic
//     const [[settings]] = await db.execute(
//       'SELECT off_persent, start_night_time, end_night_time, pickup_Charges_Auto, PickUp_Charges_Cab, night_pickup_Charges_Auto, night_PickUp_Charges_Cab FROM site_setting WHERE id = 1'
//     );

//     //

//     let citynames = await getCityNameFromLatLong(
//       source_latitude,
//       source_longitude
//     );

//     let city = await convertCityToEnglish(citynames);

//     if (!city) {
//       return res.json({
//         status: false,
//         error: 1,
//         success: 0,
//         msg: 'Invalid city',
//       });
//     }
//     //
//     const [fares] = await db.execute(
//       `
//       SELECT v.vehicle_type_image, v.vehicle_type_name, d.district_name AS city_name, f.*
//       FROM fares f
//         JOIN districts d ON d.id = f.district_id
//         JOIN vehicle v ON v.id = f.vehicle_type_id
//       WHERE d.district_name LIKE ? AND v.id = ?
//     `,
//       [`%${city}%`, vehicle_type_id]
//     );

//     if (fares.length === 0) {
//       return res.json({
//         status: false,
//         error: 1,
//         success: 0,
//         msg: 'Fare Not Found For This City',
//       });
//     }

//     // Calculate each fare option
//     const currentHour = moment().format('HH:mm');
//     const arr = fares.map((fare) => {
//       const isNight =
//         currentHour >= settings.start_night_time ||
//         currentHour < settings.end_night_time;
//       const min_charge = isNight ? fare.night_min_charge : fare.day_min_charge;
//       const per_km = isNight ? fare.night_charge : fare.day_charge;
//       const pickupCharge = isNight
//         ? +fare.vehicle_type_id === 1
//           ? settings.night_pickup_Charges_Auto
//           : settings.night_PickUp_Charges_Cab
//         : +fare.vehicle_type_id === 1
//         ? settings.pickup_Charges_Auto
//         : settings.PickUp_Charges_Cab;

//       let charge =
//         parseFloat(min_charge) +
//         parseFloat(pickupCharge) +
//         parseFloat(fare.waiting_charge) +
//         parseFloat(fare.traffic_charge);
//       if (distance > parseFloat(fare.min_km)) {
//         charge += per_km * (distance - fare.min_km);
//       }

//       charge = charge * 1.06;

//       const item = {
//         vehicle_type_image: fare.vehicle_type_image,
//         vehicle_type_name: fare.vehicle_type_name,
//         vehicle_type_id: fare.vehicle_type_id,
//         city_name: fare.city_name,
//         distance,
//         off_persent:
//           settings.off_persent > 0 ? `${settings.off_persent}% OFF` : null,
//         user_frist_ride: user.user_frist_ride === 0 ? 1 : 0,
//         first_ride_dis_amount: user.user_frist_ride !== 0 ? null : 0,
//         reffer_amount:
//           user.user_reffer_count === 10 && user.user_reffer_count_use === 0
//             ? +settings.reffer_amount
//             : null,
//         user_reffer_count: user.user_reffer_count,
//         charge,
//         taxeable_amt: charge,
//         final_amt: Math.max(
//           0,
//           charge - ((settings.off_persent || 0) / 100) * charge
//         ),
//         user_cancellationCharges: user.user_cancellationCharges,
//       };
//       return item;
//       //
//     });

//     // 8️⃣ Return success
//     res.json({
//       status: true,
//       error: 0,
//       success: 1,
//       msg: 'Book Loaded Successfully',
//       otp: generated_otp,
//       bookid,
//       user_data: arr,
//     });
//   } catch (err) {
//     console.error(err);
//     res
//       .status(500)
//       .json({ status: false, error: 1, success: 0, msg: 'Server error' });
//   }
// };

exports.bookRide = async (req, res) => {
  const {
    book_ride_id: ride_id,
    userid,
    pickup_add,
    drop_add,
    vehicle_name,
    vehicle_type_id,
    amount,
    discount_amount_status = 0,
    discount_amount = 0,
    distance,
    source_latitude,
    source_longitude,
    destination_latitude,
    destination_longitude,
    total_time,
  } = req.body;

  const date = new Date();

  try {
    // ✅ Validate required fields
    const requiredFields = {
      userid,
      pickup_add,
      drop_add,
      distance,
      source_latitude,
      source_longitude,
      destination_latitude,
      destination_longitude,
      total_time,
    };

    for (const [key, value] of Object.entries(requiredFields)) {
      if (!value)
        return res.json({
          status: false,
          error: 1,
          success: 0,
          msg: `Missing parameter ${key}`,
        });
    }

    // ✅ Check user validity
    const [userCheck] = await db.query(
      "SELECT id, user_frist_ride, user_reffer_count, user_reffer_count_use, user_cancellationCharges FROM users WHERE id = ? AND status = 1",
      [userid]
    );
    if (!userCheck.length)
      return res.json({
        status: false,
        error: 1,
        success: 0,
        msg: "Invalid userid",
      });
    const userData = userCheck[0];

    // ✅ Fetch old OTP or generate new
    const [oldOtpRow] = await db.query(
      "SELECT otp FROM booking_ride WHERE user_id = ?",
      [userid]
    );
    const otp = oldOtpRow.length
      ? oldOtpRow[0].otp
      : String(Math.floor(1000 + Math.random() * 9000));

    // ✅ Insert booking
    const [insertBooking] = await db.query(
      `INSERT INTO booking_ride 
      (user_id, driver_id, ride_id, otp, pickup_add, drop_add, distance, 
       source_latitude, source_longitude, destination_latitude, destination_longitude, 
       total_time, amount, payment_method, dt) 
       VALUES (?, '', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COD', ?)`,
      [
        userid,
        ride_id,
        otp,
        pickup_add,
        drop_add,
        distance,
        source_latitude,
        source_longitude,
        destination_latitude,
        destination_longitude,
        total_time,
        amount,
        date,
      ]
    );

    if (!insertBooking.insertId) {
      return res.json({
        status: false,
        error: 1,
        success: 0,
        msg: "Something went wrong",
      });
    }

    const bookid = insertBooking.insertId;

    // ✅ Update user flags
    await db.query("UPDATE users SET user_frist_ride='1' WHERE id=?", [userid]);
    if (discount_amount_status == 1)
      await db.query("UPDATE users SET user_reffer_count_use='1' WHERE id=?", [
        userid,
      ]);

    // ✅ Insert OTP in OTP table
    await db.query(
      "INSERT INTO otp (otp, userid, bookid, dt) VALUES (?, ?, ?, ?)",
      [otp, userid, bookid, date]
    );

    // ✅ Fetch site settings
    const [siteSettings] = await db.query(
      "SELECT * FROM site_setting WHERE id=1"
    );
    const {
      off_persent,
      start_night_time,
      end_night_time,
      pickup_Charges_Auto,
      PickUp_Charges_Cab,
      night_pickup_Charges_Auto,
      night_PickUp_Charges_Cab,
    } = siteSettings[0];

    // ✅ Get City from Lat/Long (Implement Helper Functions)
    const cityName = await getCityNameFromLatLong(
      source_latitude,
      source_longitude
    );
    const city = convertCityToEnglish(cityName);
    if (!city)
      return res.json({
        status: false,
        error: 1,
        success: 0,
        msg: "Invalid city",
      });

    // ✅ Fetch Fare Data
    const [fareData] = await db.query(
      `SELECT v.vehicle_type_image, v.vehicle_type_name, d.district_name AS city_name, f.* 
       FROM fares f 
       JOIN districts d ON d.id = f.district_id 
       JOIN vehicle v ON v.id = f.vehicle_type_id 
       WHERE d.district_name LIKE ? AND v.id = ?`,
      [`%${city}%`, vehicle_type_id]
    );

    if (!fareData.length)
      return res.json({
        status: false,
        error: 1,
        success: 0,
        msg: "Fare Not Found For This City",
      });

    const current_time = new Date().toTimeString().slice(0, 5); // HH:MM
    const resultArr = [];

    // ✅ Fare Calculation Loop
    for (const fare of fareData) {
      const min_km = parseFloat(fare.min_km);
      const isNight =
        current_time >= start_night_time || current_time < end_night_time;

      const min_charge = isNight
        ? parseFloat(fare.night_min_charge)
        : parseFloat(fare.day_min_charge);
      const charge_per_km = isNight
        ? parseFloat(fare.night_charge)
        : parseFloat(fare.day_charge);
      const pickup_charge =
        fare.vehicle_type_id == 1
          ? isNight
            ? night_pickup_Charges_Auto
            : pickup_Charges_Auto
          : isNight
          ? night_PickUp_Charges_Cab
          : PickUp_Charges_Cab;

      // Base charge
      let charge =
        min_charge +
        pickup_charge +
        parseFloat(fare.waiting_charge) +
        parseFloat(fare.traffic_charge);
      if (distance > min_km) charge += charge_per_km * (distance - min_km);
      charge *= 1.06; // Add 6% GST

      // Discounts
      let final_amt = charge;
      const reffer_amount =
        userData.user_reffer_count == 10 && userData.user_reffer_count_use == 0
          ? siteSettings[0].reffer_amount
          : null;
      if (reffer_amount) final_amt -= Math.min(reffer_amount, charge);
      if (userData.user_frist_ride == 0) final_amt -= 0; // First ride discount logic placeholder

      resultArr.push({
        vehicle_type_image: fare.vehicle_type_image,
        vehicle_type_name: fare.vehicle_type_name,
        vehicle_type_id: fare.vehicle_type_id,
        city_name: fare.city_name,
        distance,
        off_persent: off_persent > 0 ? `${off_persent}% OFF` : null,
        user_frist_ride: userData.user_frist_ride == 0 ? 1 : 0,
        reffer_amount,
        user_reffer_count: userData.user_reffer_count,
        charge,
        taxeable_amt: charge,
        final_amt: Math.max(0, final_amt),
        user_cancellationCharges: userData.user_cancellationCharges,
      });
    }

    return res.json({
      status: true,
      error: 0,
      success: 1,
      msg: "Book Loaded Successfully",
      otp,
      bookid,
      user_data: resultArr,
    });
  } catch (err) {
    console.error("bookRide error:", err);
    res.json({
      status: false,
      error: 1,
      success: 0,
      msg: "Internal Server Error",
    });
  }
};

exports.acceptOrCancelRide = async (req, res) => {
  try {
    const { driverid, ride_id, status } = req.body;

    if (!driverid) {
      return res
        .status(400)
        .json({ status: false, error: 1, success: 0, msg: "Missing driverid" });
    }

    const [driverCheck] = await db.execute(
      "SELECT id FROM drivers WHERE id = ? AND driver_active_status = 1",
      [driverid]
    );
    if (driverCheck.length === 0) {
      return res
        .status(404)
        .json({ status: false, error: 1, success: 0, msg: "Invalid driverid" });
    }

    if (!ride_id) {
      return res
        .status(400)
        .json({ status: false, error: 1, success: 0, msg: "Missing ride_id" });
    }

    const [rideCheck] = await db.execute(
      'SELECT id FROM booking_ride WHERE ride_id = ? AND trip_status = "pending"',
      [ride_id]
    );
    if (rideCheck.length === 0) {
      return res.status(404).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Invalid or already updated ride_id",
      });
    }

    if (!status || !["accept", "cancel"].includes(status)) {
      return res.status(400).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Missing or invalid status",
      });
    }

    if (status === "accept") {
      const [[ride]] = await db.execute(
        'SELECT user_id, otp FROM booking_ride WHERE ride_id = ? AND trip_status = "pending"',
        [ride_id]
      );

      const userId = ride.user_id;
      const otp = ride.otp;

      await db.execute(
        "UPDATE booking_ride SET trip_status = ?, driver_id = ? WHERE ride_id = ?",
        ["accept", driverid, ride_id]
      );

      const [[user]] = await db.execute(
        "SELECT user_device_token FROM users WHERE id = ?",
        [userId]
      );
      const deviceToken = user.user_device_token;

      if (deviceToken) {
        await sendNotification({
          title: "Welcome to Jeeyo Ride! Your OTP notification is",
          message: otp,
          deviceTokens: [deviceToken],
        });
      }

      return res.json({
        status: true,
        error: 0,
        success: 1,
        msg: "Accept Request Successfully",
      });
    } else if (status === "cancel") {
      await db.execute(
        "UPDATE booking_ride SET trip_status = ? WHERE driver_id = ? AND ride_id = ?",
        ["cancel", driverid, ride_id]
      );

      return res.json({
        status: true,
        error: 0,
        success: 1,
        msg: "Cancel Request Successfully",
      });
    }
  } catch (err) {
    console.error("Error in acceptOrCancelRide:", err);
    res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Server Error",
      detail: err.message,
    });
  }
};

exports.checkBookStatus = async (req, res) => {
  try {
    const bookid = req.body.bookid || req.query.bookid;

    if (!bookid) {
      return res.status(400).json({
        status: false,
        error: 1,
        success: 0,
        msg: "missing parameter bookid",
      });
    }

    const [rows] = await db.execute(
      "SELECT trip_status FROM booking_ride WHERE id = ?",
      [bookid]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Booking not found",
      });
    }

    const tripStatus = rows[0].trip_status;
    let msg = "";
    let book_status = null;

    if (tripStatus === "accept") {
      msg = "This request is accepted";
      book_status = true;
    } else if (tripStatus === "cancel") {
      msg = "This request is cancel";
      book_status = false;
    } else if (tripStatus === "pending") {
      msg = "This request is pending";
      book_status = null;
    } else {
      msg = `Unknown trip status: ${tripStatus}`;
    }

    return res.json({
      status: true,
      error: 0,
      success: 1,
      msg,
      book_status,
    });
  } catch (error) {
    console.error("checkBookStatus error:", error);
    return res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Server error",
      detail: error.message,
    });
  }
};

// ====================================================================================
// ====================================================================================
// =========================== END LIVE API FOR THE JEEYORIDE =========================
// ====================================================================================
// ====================================================================================

exports.getBookingRides = async (req, res) => {
  const driverId = req.query.driverid;

  if (!driverId) {
    return res.status(400).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Missing driverid",
    });
  }

  try {
    // Validate driver exists and is active
    const [driverCheck] = await db.execute(
      "SELECT id FROM drivers WHERE id = ? AND driver_active_status = 1",
      [driverId]
    );

    if (driverCheck.length === 0) {
      return res.status(404).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Invalid driverid",
      });
    }

    // Get pending rides for driver
    const [rides] = await db.execute(
      `SELECT 
  b.id AS bookid,
  b.user_id,
  u.username,
  u.user_mobile,
  u.image AS userimage,
  b.pickup_add,
  b.drop_add,
  b.distance,
  b.amount,
  b.trip_status,
  b.source_latitude,
  b.source_longitude,
  b.destination_latitude,
  b.destination_longitude,
  b.otp,
  b.payment_method,
  b.dt,
  s.service_name
FROM booking_ride b
LEFT JOIN users u ON b.user_id = u.id
LEFT JOIN drivers d ON b.driver_id = d.id
LEFT JOIN services s ON d.service_id = s.id
WHERE b.driver_id = ? 
  AND b.trip_status = 'pending'
ORDER BY b.id DESC;
    `,
      [driverId]
    );

    // Get driver details
    const [driverDetails] = await db.execute(
      "SELECT * FROM drivers WHERE id = ? AND driver_active_status = 1",
      [driverId]
    );

    if (rides.length > 0 && driverDetails.length > 0) {
      // Add driver_details to each ride
      const data = rides.map((ride) => ({
        ...ride,
        driver_details: driverDetails[0],
      }));

      return res.json({
        status: true,
        error: 0,
        success: 1,
        msg: "Successfully loaded data",
        data,
      });
    } else {
      return res.status(200).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Please wait, the rides is coming...!",
      });
    }
  } catch (err) {
    console.error("Error in getBookingRides:", err);
    return res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Internal Server Error",
    });
  }
};

// ============================================================================

exports.statusBookingRides = async (req, res) => {
  const { driverid, bookid, status } = req.body;

  if (!driverid)
    return res.json({
      status: false,
      error: 1,
      success: 0,
      msg: "Missing Driver Id",
    });
  if (!bookid)
    return res.json({
      status: false,
      error: 1,
      success: 0,
      msg: "Missing Bookid",
    });
  if (!status)
    return res.json({
      status: false,
      error: 1,
      success: 0,
      msg: "Missing Status",
    });

  try {
    const [driver] = await db.query(
      "SELECT id FROM drivers WHERE id = ? AND driver_active_status = 1",
      [driverid]
    );
    if (!driver.length)
      return res.json({
        status: false,
        error: 1,
        success: 0,
        msg: "Invalid Driverid",
      });

    const [booking] = await db.query(
      "SELECT id, user_id, otp FROM booking_ride WHERE id = ? AND trip_status = 'pending'",
      [bookid]
    );
    if (!booking.length)
      return res.json({
        status: false,
        error: 1,
        success: 0,
        msg: "Invalid Bookid",
      });

    if (status === "accept") {
      const userid = booking[0].user_id;
      const otp = booking[0].otp;

      await db.query(
        "UPDATE booking_ride SET trip_status = ? WHERE driver_id = ? AND id = ?",
        [status, driverid, bookid]
      );

      const [user] = await db.query(
        "SELECT user_device_token FROM users WHERE id = ?",
        [userid]
      );
      const deviceToken = user[0]?.user_device_token;

      if (deviceToken) {
        await sendNotification({
          title: "Welcome to Jeeyo Ride! Your OTP notification is",
          message: otp,
          deviceTokens: [deviceToken],
        });
      }

      return res.json({
        status: true,
        error: 0,
        success: 1,
        msg: "Accept Request Successfully",
      });
    } else if (status === "cancel") {
      await db.query(
        "UPDATE booking_ride SET trip_status = ? WHERE driver_id = ? AND id = ?",
        [status, driverid, bookid]
      );
      return res.json({
        status: true,
        error: 0,
        success: 1,
        msg: "Cancel Request Successfully",
      });
    } else {
      return res.json({
        status: false,
        error: 1,
        success: 0,
        msg: "invalid status",
      });
    }
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: false, error: 1, success: 0, msg: "Server error" });
  }
};

// ============================================================================

exports.bookedUserInfo = async (req, res) => {
  const bookid = req.body.bookid || req.query.bookid;

  if (!bookid) {
    return res.json({
      status: false,
      error: 1,
      success: 0,
      msg: "missing bookid",
    });
  }

  try {
    const [checkBook] = await db.query(
      "SELECT id FROM booking_ride WHERE id = ? AND trip_status IN ('accept', 'start')",
      [bookid]
    );

    if (checkBook.length === 0) {
      return res.json({
        status: false,
        error: 1,
        success: 0,
        msg: "invalid bookid",
      });
    }

    const [getData] = await db.query(
      `SELECT 
         b.user_id,
         u.username,
         u.user_mobile,
         u.image AS userimage,
         b.source_latitude,
         b.source_longitude,
         b.destination_latitude,
         b.destination_longitude,
         b.otp,
         b.id AS bookid,
         b.pickup_add,
         b.drop_add,
         b.distance,
         b.total_time,
         b.amount
       FROM booking_ride b
       LEFT JOIN users u ON b.user_id = u.id
       WHERE b.id = ?`,
      [bookid]
    );

    if (getData.length > 0) {
      return res.json({
        status: true,
        error: 0,
        success: 1,
        msg: "Successfully loaded data",
        data: getData[0],
      });
    } else {
      return res.json({
        status: false,
        error: 1,
        success: 0,
        msg: "Data not found",
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Server error",
    });
  }
};

// ============================================================================

exports.tripStatus = async (req, res) => {
  const { driverid, bookid, status } = req.body;

  if (!driverid) {
    return res.json({
      status: false,
      error: 1,
      success: 0,
      msg: "missing driverid",
    });
  }

  try {
    const [driverResult] = await db.query(
      "SELECT id FROM drivers WHERE id = ? AND driver_active_status = 1",
      [driverid]
    );

    if (driverResult.length === 0) {
      return res.json({
        status: false,
        error: 1,
        success: 0,
        msg: "invalid driverid",
      });
    }

    if (!bookid) {
      return res.json({
        status: false,
        error: 1,
        success: 0,
        msg: "missing bookid",
      });
    }

    const [bookingResult] = await db.query(
      "SELECT id FROM booking_ride WHERE id = ? AND trip_status IN ('accept', 'start')",
      [bookid]
    );

    if (bookingResult.length === 0) {
      return res.json({
        status: false,
        error: 1,
        success: 0,
        msg: "invalid bookid",
      });
    }

    if (!status) {
      return res.json({
        status: false,
        error: 1,
        success: 0,
        msg: "missing status",
      });
    }

    if (status === "start") {
      const [booking] = await db.query(
        "SELECT * FROM booking_ride WHERE id = ? AND trip_status = 'accept'",
        [bookid]
      );

      if (booking.length > 0) {
        const userid = booking[0].userid;

        await db.query(
          "UPDATE booking_ride SET trip_status = ? WHERE driver_id = ? AND id = ?",
          [status, driverid, bookid]
        );

        const [userResult] = await db.query(
          "SELECT user_device_token FROM users WHERE id = ?",
          [userid]
        );

        const deviceToken = userResult[0]?.user_device_token;

        if (deviceToken) {
          await sendNotification({
            title: "Your ride is start now",
            message: "Have a nice Journey",
            deviceTokens: [deviceToken],
          });
        }

        return res.json({
          status: true,
          error: 0,
          success: 1,
          msg: "Start Trip Successfully",
        });
      } else {
        return res.json({
          status: false,
          error: 1,
          success: 0,
          msg: "Trip not in accept status",
        });
      }
    } else if (status === "completed") {
      await db.query(
        "UPDATE booking_ride SET trip_status = ? WHERE driver_id = ? AND id = ?",
        [status, driverid, bookid]
      );
      return res.json({
        status: true,
        error: 0,
        success: 1,
        msg: "Completed Trip Successfully",
      });
    } else {
      return res.json({
        status: false,
        error: 1,
        success: 0,
        msg: "invalid status",
      });
    }
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: false, error: 1, success: 0, msg: "Server error" });
  }
};

// ============================================================================

// countRides
exports.countRides = async (req, res) => {
  const driverid = req.query.driverid || req.body.driverid;

  if (!driverid) {
    return res.json({
      status: false,
      error: 1,
      success: 0,
      msg: "missing driver id",
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

    const [rideRows] = await db.query(
      'SELECT COUNT(id) as totalride FROM booking_ride WHERE driver_id = ? AND trip_status = "pending"',
      [driverid]
    );
    const totalRides = rideRows.length > 0 ? rideRows[0].totalride : 0;
    //
    // logError(`rideRows: ${rideRows[0].totalride})`);
    //
    return res.json({
      status: true,
      error: 0,
      success: 1,
      msg: "loaded Successfully",
      count: totalRides,
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

//

exports.createTrip = async (req, res) => {
  try {
    const {
      driverid,
      pickup_add,
      drop_add,
      total_pasanger,
      amount,
      trip_date,
      trip_time,
      source_latitude,
      source_longitude,
      destination_latitude,
      destination_longitude,
      total_time,
      description,
    } = req.body;

    if (!driverid) {
      return res.status(400).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Missing parameter driverid",
      });
    }

    // Check if driver is valid and active
    const [driverCheck] = await db.query(
      "SELECT id FROM drivers WHERE id = ? AND driver_active_status = 1",
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

    // Check required fields
    if (
      !pickup_add ||
      !drop_add ||
      !total_pasanger ||
      !amount ||
      !trip_date ||
      !trip_time ||
      !source_latitude ||
      !source_longitude ||
      !destination_latitude ||
      !destination_longitude ||
      !total_time ||
      !description
    ) {
      return res.status(400).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Missing required params",
      });
    }

    // Insert trip
    const [insertResult] = await db.query(
      `
      INSERT INTO outercity_create_ride (
        driverid, pickup_add, drop_add, total_pasanger, amount,
        source_latitude, source_longitude,
        destination_latitude, destination_longitude,
        trip_date, trip_time, description, total_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        driverid,
        pickup_add,
        drop_add,
        total_pasanger,
        amount,
        source_latitude,
        source_longitude,
        destination_latitude,
        destination_longitude,
        trip_date,
        trip_time,
        description,
        total_time,
      ]
    );

    const trip_id = insertResult.insertId;

    return res.json({
      status: true,
      error: 0,
      success: 1,
      msg: "Create Successfully",
      trip_id,
    });
  } catch (error) {
    console.error("Error in createTrip:", error);
    return res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Server error",
    });
  }
};

//

exports.getRatingByBookId = async (req, res) => {
  const { driverid } = req.body;

  if (!driverid) {
    return res.json({
      status: false,
      error: 1,
      success: 0,
      msg: "Missing parameter driverid",
    });
  }

  try {
    // Check if driver exists and is active
    const [driverCheck] = await db.query(
      "SELECT id FROM drivers WHERE id = ? AND driver_active_status = 1",
      [driverid]
    );

    if (driverCheck.length === 0) {
      return res.json({
        status: false,
        error: 1,
        success: 0,
        msg: "Invalid driverid",
      });
    }

    // Get rating data based on bookid (assumed to be driverid in this function)
    const [ratings] = await db.query(
      `SELECT r.*, d.id as driverid, d.driver_full_name, d.driver_photo
             FROM driver_rating r
             LEFT JOIN drivers d ON r.driverid = d.id
             WHERE r.bookid = ?`,
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
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Server error",
    });
  }
};
