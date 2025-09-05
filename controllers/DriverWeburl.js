const db = require("../config/db_api");

exports.driverWeburlOneway = async (req, res) => {
  try {
    // ✅ Fetch site settings (id=1)
    const [rows] = await db.query(
      `SELECT 
          help_line_no,
          help,
          driver_terms_condition,
          privacy_policy,
          coptright_policy
       FROM site_setting 
       WHERE id = 1`
    );

    if (rows.length > 0) {
      return res.status(200).json({
        status: true,
        error: 0,
        success: 1,
        msg: "Driver Weburl",
        data: rows[0], // single row
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
    console.error("Error in DriverWeburlOneway:", error);
    return res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Server error",
    });
  }
};
