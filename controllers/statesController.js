const db = require("../config/db_api");

exports.getAllStates = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, country_id, state_name FROM `oneway_states` WHERE status=1 ORDER BY id ASC"
    );

    // 🔑 Convert numeric fields to strings
    const formattedRows = rows.map((row) => ({
      id: String(row.id),
      country_id: String(row.country_id),
      state_name: row.state_name,
    }));

    res.status(200).json({
      status: true,
      error: 0,
      success: 1,
      msg: "State List",
      data: formattedRows,
    });
  } catch (error) {
    console.error("Error fetching states:", error);
    res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Server error",
      data: [],
    });
  }
};
