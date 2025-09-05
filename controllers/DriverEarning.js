const db = require("../config/db_api");

exports.driverEarningOneway = async (req, res) => {
  try {
    const driverid = req.body.driverid || req.query.driverid;

    // ✅ Validate driver ID
    if (!driverid) {
      return res.status(400).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Driver ID is required",
      });
    }

    // ✅ Fetch total earnings and completed ride count
    const [rows] = await db.query(
      `SELECT 
          IFNULL(SUM(amount), 0) AS total_earning, 
          IFNULL(COUNT(id), 0) AS total_rides
       FROM outercity_create_ride 
       WHERE driverid = ? AND trip_status = 'completed'`,
      [driverid]
    );

    if (rows && rows.length > 0) {
      const driverData = rows[0];

      // ✅ Prepare response data (force string for total_rides)
      const data = {
        total_earning: driverData.total_earning || 0,
        total_rides: String(driverData.total_rides || 0),
      };

      return res.status(200).json({
        status: true,
        error: 0,
        success: 1,
        msg: "Driver Data Loaded Successfully",
        data,
      });
    } else {
      return res.status(200).json({
        status: false,
        error: 1,
        success: 0,
        msg: "No data found",
      });
    }
  } catch (error) {
    console.error("Error in DriverEarning:", error);
    return res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Server error",
    });
  }
};
