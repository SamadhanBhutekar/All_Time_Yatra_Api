const db = require("../config/db_api");

exports.bookTripStatusPassenger = async (req, res) => {
  try {
    const trip_id = req.body.ride_id || req.query.ride_id;
    const passenger_id = req.body.passenger_id || req.query.passenger_id;
    const passenger_ride_status =
      req.body.pasenger_ride_status || req.query.pasenger_ride_status;

    // ✅ Validate required params
    if (!trip_id || !passenger_id || passenger_ride_status === undefined) {
      return res.status(200).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Missing required parameters (ride_id, passenger_id, pasenger_ride_status)",
      });
    }

    // ✅ Update booking status
    const [updateResult] = await db.query(
      `UPDATE booking_outercity_ride 
       SET book_status = ? 
       WHERE trip_id = ? AND userid = ?`,
      [passenger_ride_status, trip_id, passenger_id]
    );

    if (updateResult.affectedRows > 0) {
      return res.status(200).json({
        status: true,
        error: 0,
        success: 1,
        msg: "Status updated successfully",
      });
    } else {
      return res.status(200).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Failed to update status",
      });
    }
  } catch (error) {
    console.error("Error in bookTripStatusPassenger:", error);
    return res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Server error",
    });
  }
};
