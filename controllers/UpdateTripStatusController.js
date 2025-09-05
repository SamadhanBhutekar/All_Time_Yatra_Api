const db = require("../config/db_api");

exports.updateTripStatusOneway = async (req, res) => {
  try {
    const trip_id = req.body.ride_id || req.query.ride_id;
    const status = req.body.ride_status || req.query.ride_status;
    const driver_id = req.body.driver_id || req.query.driver_id;

    if (!trip_id || !status) {
      return res.status(200).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Missing parameters",
      });
    }

    // ✅ Check if trip exists for this driver and not deleted
    const [tripCheck] = await db.query(
      "SELECT id FROM outercity_create_ride WHERE id = ? AND driverid = ? AND deleted = 0",
      [trip_id, driver_id]
    );

    if (tripCheck.length === 0) {
      return res.status(200).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Invalid trip ID",
      });
    }

    // ✅ Get full trip data
    const [tripDataRows] = await db.query(
      "SELECT * FROM outercity_create_ride WHERE id = ?",
      [trip_id]
    );
    const tripData = tripDataRows[0];

    if (tripData.trip_status === "booked" || tripData.trip_status === "start") {
      // 🚖 Trip Starting
      if (status === "start") {
        const [passengerResult] = await db.query(
          "SELECT SUM(total_pasanger) AS total_pasanger FROM booking_outercity_ride WHERE trip_id = ?",
          [trip_id]
        );
        const totalPassengers = passengerResult[0]?.total_pasanger || 0;

        // GST Calculation: 6% per passenger
        const gst_per_person = tripData.amount * 0.06;
        const total_gst_amount = gst_per_person * totalPassengers;

        // Update trip and driver
        await db.query(
          "UPDATE outercity_create_ride SET trip_status='start', total_gst=? WHERE id=?",
          [total_gst_amount, trip_id]
        );
        // await db.query(
        //   "UPDATE one_way_drivers SET trip_cancel_status='1' WHERE id=?",
        //   [tripData.driverid]
        // );

        return res.status(200).json({
          status: true,
          error: 0,
          success: 1,
          msg: "Trip started successfully",
        });
      }

      // ✅ Trip Completed
      if (status === "completed") {
        await db.query(
          "UPDATE outercity_create_ride SET trip_status='completed' WHERE id=?",
          [trip_id]
        );

        return res.status(200).json({
          status: true,
          error: 0,
          success: 1,
          msg: "Trip completed successfully",
        });
      }
    } else {
      return res.status(200).json({
        status: false,
        error: 1,
        success: 0,
        msg: "No booking found for this trip",
      });
    }
  } catch (error) {
    console.error("Error in updateTripStatusOneway:", error);
    return res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Server error",
    });
  }
};
