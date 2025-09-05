const db = require("../config/db_api");

exports.checkUserExistsOneway = async (req, res) => {
  try {
    const driver_mobile =
      req.body.driver_mobile || req.query.driver_mobile || "";

    if (!driver_mobile) {
      return res.status(400).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Driver mobile number is required.",
        driver_data: null,
      });
    }

    const [rows] = await db.query(
      "SELECT driver_mobile, registration_status FROM one_way_drivers WHERE driver_mobile = ? AND registration_status=1",
      [driver_mobile]
    );

    if (rows.length > 0) {
      return res.status(200).json({
        status: true,
        error: 0,
        success: 1,
        msg: "Driver data.",
        driver_data: rows[0],
      });
    } else {
      return res.status(200).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Driver data.",
        driver_data: {
          driver_mobile,
          registration_status: "0",
        },
      });
    }
  } catch (error) {
    console.error("Error checking driver:", error);
    return res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Server error",
      driver_data: null,
    });
  }
};
