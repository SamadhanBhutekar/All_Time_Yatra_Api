const db = require("../config/db_api");
const axios = require("axios");

exports.loginSendOtpOneway = async (req, res) => {
  try {
    const driver_mobile = req.body.driver_mobile || req.query.driver_mobile;
    const otp = Math.floor(1111 + Math.random() * 8888); // 1111–9999

    if (!driver_mobile) {
      return res.status(200).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Missing Required Parameters",
      });
    }

    // ✅ Check if driver exists
    const [driver] = await db.query(
      "SELECT driver_mobile FROM one_way_drivers WHERE driver_mobile = ?",
      [driver_mobile]
    );

    if (driver.length === 0) {
      return res.status(200).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Sign Up First",
      });
    }

    // ✅ Call OTP API (2factor.in)
    let otpResponse;
    try {
      otpResponse = await axios.get(
        `https://2factor.in/API/V1/dc22dd14-24c5-11ef-8b60-0200cd936042/SMS/${driver_mobile}/${otp}/OTP_LOGIN`,
        {
          headers: { "cache-control": "no-cache" },
          timeout: 30000,
        }
      );
    } catch (err) {
      console.error("OTP API Error:", err.message);
      return res.status(200).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Something went Wrong",
      });
    }

    if (otpResponse && otpResponse.data) {
      const login_time = new Date().toLocaleTimeString("en-GB", {
        hour12: false,
      }); // HH:mm:ss
      const login_date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

      // ✅ Mark old login history as deleted
      await db.query(
        "UPDATE Onewaydriver_login_history SET deleted = 1 WHERE driver_mobile = ?",
        [driver_mobile]
      );

      // ✅ Insert new login history
      await db.query(
        "INSERT INTO Onewaydriver_login_history (driver_mobile, login_time, login_date, driver_otp, deleted) VALUES (?, ?, ?, ?, 0)",
        [driver_mobile, login_time, login_date, otp]
      );

      return res.status(200).json({
        status: true,
        error: 0,
        success: 1,
        msg: "OTP Sent Sucessfully",
        otp: otp, // ⚠️ In production, usually we don’t send OTP in response
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
    console.error("Error in loginSendOtpOneway:", error);
    return res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Server error",
    });
  }
};
