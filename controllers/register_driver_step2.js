const db = require("../config/db_api");

exports.registerDriverStep2 = async (req, res) => {
  try {
    const {
      driver_full_name = "",
      driver_email = "",
      driver_address = "",
      driver_district_id = "",
      driver_state_id = "",
      driver_village = "",
      driver_country_id = "",
      driver_language = "",
      driver_mobile = "",
    } = req.body;

    if (!driver_mobile.trim()) {
      return res.status(200).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Missing driver_mobile for update.",
      });
    }

    // --- Update query ---
    const [updateResult] = await db.query(
      `UPDATE one_way_drivers 
       SET driver_full_name   = ?,
           driver_email       = ?,
           driver_address     = ?,
           driver_district_id = ?,
           driver_state_id    = ?,
           driver_village     = ?,
           driver_country_id  = ?,
           driver_language    = ?,
           updated_at         = NOW()
       WHERE driver_mobile = ?`,
      [
        driver_full_name,
        driver_email,
        driver_address,
        driver_district_id,
        driver_state_id,
        driver_village,
        driver_country_id,
        driver_language,
        driver_mobile,
      ]
    );

    if (updateResult.affectedRows > 0) {
      // Fetch updated record
      const [rows] = await db.query(
        "SELECT * FROM one_way_drivers WHERE driver_mobile = ? LIMIT 1",
        [driver_mobile]
      );

      if (rows.length > 0) {
        const driverData = rows[0];
        const driverid = driverData.id;

        // Generate username
        const dusername = "JEEYORIDED" + String(driverid).padStart(4, "0");

        await db.query(
          "UPDATE one_way_drivers SET username=? WHERE driver_mobile=?",
          [dusername, driver_mobile]
        );

        driverData.username = dusername; // attach username to response

        return res.status(200).json({
          status: true,
          error: 0,
          success: 1,
          msg: "Driver updated successfully.",
          driver_data: driverData,
        });
      }
    }

    return res.status(200).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Failed to update driver.",
      driver_data: null,
    });
  } catch (err) {
    console.error("Error in registerDriverStep2:", err);
    return res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Server error",
    });
  }
};
