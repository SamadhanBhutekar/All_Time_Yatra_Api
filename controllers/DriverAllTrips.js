const db = require("../config/db_api");

exports.driverAllTripsOneway = async (req, res) => {
  try {
    const driverid = req.body.driverid || req.query.driverid;

    if (!driverid) {
      return res.status(400).json({
        status: false,
        error: 1,
        success: 0,
        msg: "missing parameter driverid",
      });
    }

    // ✅ Check driver exists
    const [driverRows] = await db.query(
      "SELECT id FROM one_way_drivers WHERE id = ?",
      [driverid]
    );

    if (driverRows.length === 0) {
      return res.status(200).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Invalid driverid",
      });
    }

    // ✅ Get all trips (force string outputs like PHP)
    const [trips] = await db.query(
      `SELECT 
          CAST(id AS CHAR) AS id,
          CAST(driverid AS CHAR) AS driverid,
          pickup_add, drop_add,
          CAST(total_pasanger AS CHAR) AS total_pasanger,
          CAST(amount AS CHAR) AS amount,
          trip_status,
          source_latitude, source_longitude, 
          destination_latitude, destination_longitude,
          trip_date, trip_time, description, total_time,
          DATE_FORMAT(dt, '%Y-%m-%d %H:%i:%s') AS dt,
          CAST(cancel AS CHAR) AS cancel,
          CAST(trippay_status AS CHAR) AS trippay_status,
          CAST(deleted AS CHAR) AS deleted,
          total_gst
       FROM outercity_create_ride
       WHERE driverid = ?
       ORDER BY id DESC`,
      [driverid]
    );

    if (trips.length > 0) {
      return res.status(200).json({
        status: true,
        error: 0,
        success: 1,
        msg: "Driver List Of All Trips",
        data: trips,
      });
    } else {
      return res.status(200).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Data Not Found",
      });
    }
  } catch (error) {
    console.error("Error in DriverAllTripsOneway:", error);
    return res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Server error",
    });
  }
};
