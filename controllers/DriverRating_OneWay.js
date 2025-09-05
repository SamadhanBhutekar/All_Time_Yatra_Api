// controllers/giveRating.js
const db = require("../config/db_api");

exports.giveRating = async (req, res) => {
  try {
    const { userid, driverid, bookid, rating, comment } = req.body;

    const date = new Date();

    if (!userid) {
      return res.status(400).json({
        status: false,
        error: 1,
        success: 0,
        msg: "missing parameter userid",
      });
    }

    // Check if user exists
    const [userCheck] = await db.query(
      "SELECT id FROM oneway_users WHERE id = ? AND status = 1",
      [userid]
    );
    if (userCheck.length === 0) {
      return res
        .status(400)
        .json({ status: false, error: 1, success: 0, msg: "invalid userid" });
    }

    if (!driverid) {
      return res.status(400).json({
        status: false,
        error: 1,
        success: 0,
        msg: "missing parameter driverid",
      });
    }

    // Check if driver exists
    const [driverCheck] = await db.query(
      "SELECT id FROM one_way_drivers WHERE id = ?",
      [driverid]
    );
    if (driverCheck.length === 0) {
      return res
        .status(400)
        .json({ status: false, error: 1, success: 0, msg: "invalid driverid" });
    }

    if (!bookid) {
      return res.status(400).json({
        status: false,
        error: 1,
        success: 0,
        msg: "missing parameter bookid",
      });
    }

    if (rating == null) {
      return res.status(400).json({
        status: false,
        error: 1,
        success: 0,
        msg: "missing parameter rating",
      });
    }

    if (!comment) {
      return res.status(400).json({
        status: false,
        error: 1,
        success: 0,
        msg: "missing parameter comment",
      });
    }

    // Check if rating already exists
    const [existingRating] = await db.query(
      "SELECT * FROM OneWay_driver_rating WHERE userid = ? AND driverid = ? AND bookid = ? AND deleted = 0",
      [userid, driverid, bookid]
    );

    if (existingRating.length > 0) {
      return res.status(200).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Already give the rating",
      });
    }

    // Insert new rating
    const [insertResult] = await db.query(
      "INSERT INTO OneWay_driver_rating (userid, driverid, bookid, rating, comment, dt) VALUES (?, ?, ?, ?, ?, ?)",
      [userid, driverid, bookid, rating, comment, date]
    );

    if (insertResult.affectedRows > 0) {
      return res.status(200).json({
        status: true,
        error: 0,
        success: 1,
        msg: "Give Rating Successfully",
      });
    } else {
      return res.status(500).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Give Rating Unsuccessfully",
      });
    }
  } catch (err) {
    console.error("Error in giveRating:", err);
    return res
      .status(500)
      .json({ status: false, error: 1, success: 0, msg: "Server error" });
  }
};
