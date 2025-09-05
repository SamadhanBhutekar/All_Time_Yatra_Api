const db = require("../config/db_api");

exports.driverDashboardOneway = async (req, res) => {
  try {
    const driverid = req.body.driverid || req.query.driverid;

    if (!driverid) {
      return res.status(400).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Driver ID is required",
      });
    }

    // Get today's date in IST (YYYY-MM-DD)
    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });

    const [rows] = await db.query(
      `
      SELECT 
        IFNULL(SUM(amount), 0) AS total_earning,
        IFNULL(COUNT(id), 0) AS total_rides,
        IFNULL(SUM(CASE WHEN DATE(dt) = ? THEN amount ELSE 0 END), 0) AS today_earning,
        IFNULL(COUNT(CASE WHEN DATE(dt) = ? THEN 1 END), 0) AS today_rides
      FROM outercity_create_ride 
      WHERE driverid = ? AND trip_status = 'completed'
      `,
      [today, today, driverid]
    );

    const driverData = rows[0] || {};

    // Force numbers for earning, but keep rides as string (like PHP behavior)
    const data = {
      total_earning: Number(driverData.total_earning) || 0,
      total_rides: String(driverData.total_rides || "0"),
      today_earning: Number(driverData.today_earning) || 0,
      today_rides: String(driverData.today_rides || "0"),
    };

    return res.status(200).json({
      status: true,
      error: 0,
      success: 1,
      msg: "Driver Data Loaded Successfully",
      data,
    });
  } catch (error) {
    console.error("Error in Driver Dashboard:", error);
    return res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Server error",
    });
  }
};
