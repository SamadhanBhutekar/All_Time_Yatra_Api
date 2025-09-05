const db = require("../config/db_api");

exports.getAllCountries = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT country_name FROM `oneway_countries` WHERE status=1 ORDER BY id ASC"
    );

    // No need to convert anything because only country_name is selected
    const formattedRows = rows.map((row) => ({
      country_name: row.country_name,
    }));

    res.status(200).json({
      status: true,
      error: 0,
      success: 1,
      msg: "Country List",
      data: formattedRows,
    });
  } catch (error) {
    console.error("Error fetching countries:", error);
    res.status(500).json({
      status: false,
      error: 1,
      success: 0,
      msg: "Server error",
      data: [],
    });
  }
};
