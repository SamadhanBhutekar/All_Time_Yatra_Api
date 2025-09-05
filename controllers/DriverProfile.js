const db = require("../config/db_api");

exports.driverProfileOneway = async (req, res) => {
  try {
    const driverid = req.body.driverid || req.query.driverid;

    if (!driverid) {
      return res.status(400).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Driver ID is required",
      });
    }

    // ✅ Fetch driver data
    const [driverRows] = await db.query(
      "SELECT driver_profile_photo, driver_full_name, driver_district_id FROM one_way_drivers WHERE id = ?",
      [driverid]
    );

    if (!driverRows || driverRows.length === 0) {
      return res.status(200).json({
        status: false,
        error: 1,
        success: 0,
        msg: "No data found",
      });
    }

    const driverData = driverRows[0];

    // ✅ Fetch district name
    let districtName = "";
    if (driverData.driver_district_id) {
      const [districtRows] = await db.query(
        "SELECT district_name FROM one_way_districts WHERE id = ?",
        [driverData.driver_district_id]
      );
      if (districtRows && districtRows.length > 0) {
        districtName = districtRows[0].district_name;
      }
    }

    // ✅ Calculate remaining days
    const planDate = driverData.plan_date || null;
    const validityDays = driverData.days ? parseInt(driverData.days) : 0;
    const currentDate = new Date();
    let remainingDays = 0;

    if (planDate) {
      const expireDate = new Date(planDate);
      expireDate.setDate(expireDate.getDate() + validityDays);

      if (expireDate > currentDate) {
        const diffTime = expireDate.getTime() - currentDate.getTime();
        remainingDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      }
    }

    // ✅ Prepare response data
    const data = {
      driver_photo: driverData.driver_profile_photo,
      driver_full_name: driverData.driver_full_name,
      "City Name": districtName,
      plan_date: planDate,
      days: validityDays,
      remaining_days: remainingDays,
    };

    return res.status(200).json({
      status: true,
      error: 0,
      success: 1,
      msg: "Driver Data Loaded Successfully",
      data,
    });
  } catch (error) {
    console.error("Error in Driver Profile:", error);
    return res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Server error",
    });
  }
};
