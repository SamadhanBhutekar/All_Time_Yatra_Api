const db = require("../config/db_api");

exports.getAllServices = async (req, res) => {
  try {
    // ✅ Fetch service type (id = 2 & status = 1)
    const [serviceType] = await db.query(
      "SELECT service_name, id FROM services WHERE id = 2 AND status = 1"
    );

    if (serviceType.length > 0) {
      return res.status(200).json({
        status: true,
        error: 0,
        success: 1,
        msg: "Service Type List",
        data: serviceType,
      });
    } else {
      return res.status(200).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Missing Service Type",
        data: [],
      });
    }
  } catch (error) {
    console.error("Error in serviceType:", error);
    return res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Server error",
      data: [],
    });
  }
};
