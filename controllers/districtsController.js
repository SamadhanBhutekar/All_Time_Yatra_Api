const db = require("../config/db_api");

exports.getAllDistricts = async (req, res) => {
  try {
    const { state_id } = req.body;

    if (!state_id) {
      return res.status(400).json({
        status: false,
        error: 1,
        success: 0,
        msg: "state_id is required",
        data: [],
      });
    }

    const [rows] = await db.query(
      "SELECT id, country_id, state_id, district_name FROM `one_way_districts` WHERE deleted=1 AND state_id=? ORDER BY id ASC",
      [state_id]
    );

    // 🔑 Convert numbers to strings
    const formattedRows = rows.map((row) => ({
      id: String(row.id),
      country_id: String(row.country_id),
      state_id: String(row.state_id),
      district_name: row.district_name,
    }));

    res.status(200).json({
      status: true,
      error: 0,
      success: 1,
      msg: "City List",
      data: formattedRows,
    });
  } catch (error) {
    console.error("Error fetching districts:", error);
    res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Server error",
      data: [],
    });
  }
};
