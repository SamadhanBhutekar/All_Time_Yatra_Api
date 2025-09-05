const db = require("../config/db_api");

exports.createTripOneway = async (req, res) => {
  try {
    const {
      driverid,
      pickup_add,
      drop_add,
      total_pasanger,
      amount,
      trip_date,
      trip_time,
      source_latitude,
      source_longitude,
      destination_latitude,
      destination_longitude,
      total_time,
      description,
    } = req.body; // you can also support req.query if needed

    // ✅ Check if driverid is provided
    if (!driverid) {
      return res.status(200).json({
        status: false,
        error: 1,
        success: 0,
        msg: "missing parameter driverid",
      });
    }

    // ✅ Check driver exists
    const [driverCheck] = await db.query(
      "SELECT id FROM drivers WHERE id = ?",
      [driverid]
    );

    if (driverCheck.length === 0) {
      return res.status(200).json({
        status: false,
        error: 1,
        success: 0,
        msg: "invalid driverid",
      });
    }

    // ✅ Validate all required params
    if (
      !pickup_add ||
      !drop_add ||
      !total_pasanger ||
      !amount ||
      !trip_date ||
      !trip_time ||
      !source_latitude ||
      !source_longitude ||
      !destination_latitude ||
      !destination_longitude ||
      !total_time ||
      !description
    ) {
      return res.status(200).json({
        status: false,
        error: 1,
        success: 0,
        msg: "missing required params",
      });
    }

    // ✅ Insert trip
    const [insertResult] = await db.query(
      `INSERT INTO outercity_create_ride 
      (driverid, pickup_add, drop_add, total_pasanger, amount, 
       source_latitude, source_longitude, destination_latitude, destination_longitude, 
       trip_date, trip_time, description, total_time) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        driverid,
        pickup_add,
        drop_add,
        total_pasanger,
        amount,
        source_latitude,
        source_longitude,
        destination_latitude,
        destination_longitude,
        trip_date,
        trip_time,
        description,
        total_time,
      ]
    );

    if (insertResult.affectedRows > 0) {
      return res.status(200).json({
        status: true,
        error: 0,
        success: 1,
        msg: "Trip Create Successfully",
        trip_id: insertResult.insertId, // ensure trip_id returned as string
      });
    } else {
      return res.status(200).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Failed to create trip",
      });
    }
  } catch (error) {
    console.error("Error in createTripOneway:", error);
    return res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Server error",
    });
  }
};
