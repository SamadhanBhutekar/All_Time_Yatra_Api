// controllers/completedTripsOneway.js
const db = require("../config/db_api");

exports.completedTripsOneway = async (req, res) => {
  try {
    const driver_id = req.body.driver_id || req.query.driver_id;

    if (!driver_id) {
      return res.status(400).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Driver ID is required",
        data: [],
      });
    }

    const [driverTrips] = await db.query(
      "SELECT * FROM outercity_create_ride WHERE trip_status = ? AND driverid = ?",
      ["completed", driver_id]
    );

    if (driverTrips.length > 0) {
      return res.status(200).json({
        status: true,
        error: 0,
        success: 1,
        msg: "TripHistory List Completed",
        data: driverTrips,
      });
    } else {
      return res.status(200).json({
        status: false,
        error: 1,
        success: 0,
        msg: "No trips History",
        data: [],
      });
    }
  } catch (err) {
    console.error("Error fetching completed trips:", err);
    return res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Server error",
      data: [],
    });
  }
};
