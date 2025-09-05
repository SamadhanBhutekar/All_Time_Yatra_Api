const path = require("path");
const fs = require("fs");
const multer = require("multer");
const db = require("../config/db_api");

// --- Multer setup for file upload ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Project root + uploads/drivers_profile
    const dir = path.resolve(process.cwd(), "drivers_profile");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "_" + file.originalname);
  },
});

const upload = multer({ storage }).single("driver_profile_photo");

// --- Controller function ---
exports.updateDriverProfile = (req, res) => {
  upload(req, res, async (err) => {
    try {
      if (err) {
        return res.status(200).json({
          status: false,
          error: 1,
          success: 0,
          msg: "File upload error",
        });
      }

      const driverid = req.body.driverid || "";
      const driver_email = req.body.driver_email || "";

      if (!driverid) {
        return res.status(200).json({
          status: false,
          error: 1,
          success: 0,
          msg: "Missing required field: driverid",
        });
      }

      let filePath = "";
      if (req.file) {
        // Save relative URL to DB
        filePath = `drivers_profile/${req.file.filename}`;
      } else if (req.body.driver_profile_photo) {
        filePath = req.body.driver_profile_photo;
      }

      // Build dynamic update query
      const updates = [];
      const params = [];

      if (filePath) {
        updates.push("driver_profile_photo = ?");
        params.push(filePath);
      }
      if (driver_email) {
        updates.push("driver_email = ?");
        params.push(driver_email);
      }

      if (updates.length === 0) {
        return res.status(200).json({
          status: false,
          error: 1,
          success: 0,
          msg: "No data to update",
        });
      }

      params.push(driverid);

      await db.query(
        `UPDATE one_way_drivers SET ${updates.join(", ")} WHERE id = ?`,
        params
      );

      const [rows] = await db.query(
        "SELECT id, driver_email, driver_profile_photo FROM one_way_drivers WHERE id = ? LIMIT 1",
        [driverid]
      );

      return res.status(200).json({
        status: true,
        error: 0,
        success: 1,
        msg: "Driver profile updated successfully",
        driver_data: rows.length > 0 ? rows[0] : {},
      });
    } catch (error) {
      console.error("Error in updateDriverProfile:", error);
      return res.status(500).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Server error",
      });
    }
  });
};
