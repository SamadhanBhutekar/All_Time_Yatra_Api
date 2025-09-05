const db = require("../config/db_api");

exports.verifyOtpOneway = async (req, res) => {
  try {
    const driver_mobile = req.body.driver_mobile || req.query.driver_mobile;
    const otp = req.body.driver_otp || req.query.driver_otp;

    const login_time = new Date().toLocaleTimeString("en-GB", {
      hour12: false,
    }); // HH:mm:ss
    const login_date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    if (!driver_mobile || !otp) {
      return res.status(200).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Missing Required Parameters",
      });
    }

    // ✅ Get latest OTP for this driver
    const [rows] = await db.query(
      "SELECT driver_otp FROM Onewaydriver_login_history WHERE driver_mobile = ? AND deleted = 0 ORDER BY id DESC LIMIT 1",
      [driver_mobile]
    );

    if (rows.length === 0) {
      return res.status(200).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Invalid OTP",
      });
    }

    const dbOtp = rows[0].driver_otp;

    if (String(otp) === String(dbOtp)) {
      // ✅ Mark login as verified (set deleted = 1)
      await db.query(
        "UPDATE Onewaydriver_login_history SET driver_mobile = ?, login_time = ?, login_date = ?, deleted = 1 WHERE driver_mobile = ?",
        [driver_mobile, login_time, login_date, driver_mobile]
      );

      // ✅ Fetch driver data
      const [driverdata] = await db.query(
        "SELECT id, driver_mobile FROM one_way_drivers WHERE driver_mobile = ?",
        [driver_mobile]
      );

      return res.status(200).json({
        status: true,
        error: 0,
        success: 1,
        msg: "Sucessfully Verified",
        driver_data: driverdata,
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
    console.error("Error in verifyOtpOneway:", error);
    return res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Server Error",
    });
  }
};
