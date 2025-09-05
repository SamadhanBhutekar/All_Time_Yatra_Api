const db = require("../config/db_api");

exports.tripSummaryOneway = async (req, res) => {
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

    // ✅ Check trip exists
    const [tripCheck] = await db.query(
      "SELECT id FROM outercity_create_ride WHERE id = ? AND deleted = 0",
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

    // ✅ Fetch trip details with formatted dt
    const [tripData] = await db.query(
      `SELECT id, driverid, pickup_add, drop_add, total_pasanger, amount, trip_status,
              source_latitude, source_longitude, destination_latitude, destination_longitude,
              trip_date, trip_time, description, total_time,
              DATE_FORMAT(dt, '%Y-%m-%d %H:%i:%s') as dt,
              cancel, trippay_status, deleted, total_gst
       FROM outercity_create_ride 
       WHERE id = ?`,
      [trip_id]
    );

    if (tripData.length > 0) {
      const row = tripData[0];

      // 🔄 Convert numbers to strings (to match PHP response exactly)
      const formattedData = {
        id: String(row.id),
        driverid: String(row.driverid),
        pickup_add: row.pickup_add,
        drop_add: row.drop_add,
        total_pasanger: String(row.total_pasanger),
        amount: String(row.amount),
        trip_status: row.trip_status,
        source_latitude: row.source_latitude,
        source_longitude: row.source_longitude,
        destination_latitude: row.destination_latitude,
        destination_longitude: row.destination_longitude,
        trip_date: row.trip_date,
        trip_time: row.trip_time,
        description: row.description,
        total_time: row.total_time,
        dt: row.dt,
        cancel: String(row.cancel),
        trippay_status: String(row.trippay_status),
        deleted: String(row.deleted),
        total_gst: row.total_gst !== null ? String(row.total_gst) : null,
      };

      return res.status(200).json({
        status: true,
        error: 0,
        success: 1,
        msg: "Trip Summary",
        data: formattedData,
      });
    } else {
      return res.status(200).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Trip not found",
      });
    }
  } catch (error) {
    console.error("Error in tripSummaryOneway:", error);
    return res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Server error",
    });
  }
};
