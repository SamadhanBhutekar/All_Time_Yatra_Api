const db = require("../config/db_api");

exports.logoutDriverOneway = async (req, res) => {
  try {
    const driverid = req.body.driverid || req.query.driverid;

    // ✅ Check if driverid is provided
    if (!driverid) {
      return res.status(400).json({
        status: false,
        error: 1,
        success: 0,
        msg: "missing parameter driver id",
      });
    }

    // ✅ Check if driver exists
    const [rows] = await db.query(
      "SELECT id FROM one_way_drivers WHERE id = ?",
      [driverid]
    );

    if (rows.length > 0) {
      return res.status(200).json({
        status: true,
        error: 0,
        success: 1,
        msg: "Logout Successfully",
      });
    } else {
      return res.status(200).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Invalid driver id",
      });
    }
  } catch (error) {
    console.error("Error in LogoutDriverOneway:", error);
    return res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Server error",
    });
  }
};
