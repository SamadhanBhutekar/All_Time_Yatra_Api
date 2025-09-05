const db = require("../config/db_api");

exports.passengerListOneway = async (req, res) => {
  try {
    const trip_id = req.body.ride_id || req.query.ride_id;

    if (!trip_id) {
      return res.status(200).json({
        status: false,
        error: 1,
        success: 0,
        msg: "missing parameter trip_id",
      });
    }

    // ✅ Check if trip_id exists in passengers table
    const [tripCheck] = await db.query(
      "SELECT id FROM booking_outercity_ride WHERE trip_id = ? AND deleted = 0",
      [trip_id]
    );

    if (tripCheck.length === 0) {
      return res.status(200).json({
        status: false,
        error: 1,
        success: 0,
        msg: "invalid trip_id",
      });
    }

    // ✅ Fetch passenger list
    const [passengerData] = await db.query(
      "SELECT * FROM booking_outercity_ride WHERE trip_id = ?",
      [trip_id]
    );

    if (passengerData.length > 0) {
      // Convert all numeric fields to string for PHP-like response
      const formattedData = passengerData.map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => [
            key,
            value !== null ? String(value) : null,
          ])
        )
      );

      return res.status(200).json({
        status: true,
        error: 0,
        success: 1,
        msg: "List Of Passengers",
        data: formattedData,
      });
    } else {
      return res.status(200).json({
        status: false,
        error: 1,
        success: 0,
        msg: "No passengers found",
      });
    }
  } catch (error) {
    console.error("Error in passengerListOneway:", error);
    return res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Server error",
    });
  }
};
