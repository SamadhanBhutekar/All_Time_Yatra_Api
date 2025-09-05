const db = require("../config/db_api");

exports.registerDriverStep3 = async (req, res) => {
  try {
    const {
      driver_mobile = "",
      driver_vehicle_number = "",
      driver_vehicle_name = "",
      service_id = "",
    } = req.body;

    if (!driver_mobile.trim()) {
      return res.status(200).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Driver Mobile No is required",
      });
    }

    // --- Update driver vehicle info ---
    const [updateResult] = await db.query(
      `UPDATE one_way_drivers
       SET driver_vehicle_number = ?,
           driver_vehicle_name   = ?,
           service_id            = ?,
           updated_at            = NOW()
       WHERE driver_mobile = ?`,
      [driver_vehicle_number, driver_vehicle_name, service_id, driver_mobile]
    );

    if (updateResult.affectedRows > 0) {
      const [rows] = await db.query(
        "SELECT * FROM one_way_drivers WHERE driver_mobile = ? LIMIT 1",
        [driver_mobile]
      );

      const driverData = rows.length > 0 ? rows[0] : null;

      return res.status(200).json({
        status: true,
        error: 0,
        success: 1,
        msg: "Vehicle info updated successfully.",
        driver_data: driverData,
      });
    }

    return res.status(200).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Failed to update vehicle info.",
      driver_data: null,
    });
  } catch (err) {
    console.error("Error in registerDriverStep3:", err);
    return res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Server error",
    });
  }
};
