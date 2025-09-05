const path = require("path");
const fs = require("fs");
const multer = require("multer");
const db = require("../config/db_api");

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.resolve(process.cwd(), "drivers_profile");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "_" + file.originalname);
  },
});

const upload = multer({ storage }).single("driver_profile_photo");

exports.registerDriverStep1 = (req, res) => {
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

      let filePath = "";
      if (req.file) {
        filePath = `drivers_profile/${req.file.filename}`.replace(/\\/g, "/");
      } else if (req.body.driver_profile_photo) {
        filePath = req.body.driver_profile_photo.replace(/\\/g, "/");
      }

      const driver_mobile = req.body.driver_mobile;

      // Validate driver_mobile
      if (
        !driver_mobile ||
        isNaN(driver_mobile) ||
        Number(driver_mobile) <= 0
      ) {
        return res.status(200).json({
          status: false,
          error: 1,
          success: 0,
          msg: "Invalid driver_mobile. Must be a positive number.",
        });
      }

      // Insert or update using ON DUPLICATE KEY
      const sql = `
        INSERT INTO one_way_drivers (driver_mobile, driver_profile_photo, created_at)
        VALUES (?, ?, NOW())
        ON DUPLICATE KEY UPDATE
        driver_profile_photo = VALUES(driver_profile_photo),
        updated_at = NOW()
      `;
      await db.query(sql, [driver_mobile, filePath]);

      // Fetch the driver data (always return this)
      const [rows] = await db.query(
        "SELECT id, driver_mobile, driver_profile_photo FROM one_way_drivers WHERE driver_mobile = ? LIMIT 1",
        [driver_mobile]
      );
      let driverData = rows.length > 0 ? rows[0] : {};
      if (driverData.id) driverData.id = driverData.id.toString();

      return res.status(200).json({
        status: true,
        error: 0,
        success: 1,
        msg: "Step 1 completed successfully",
        driver_data: rows.length > 0 ? rows[0] : {},
      });
    } catch (error) {
      console.error("Error in registerDriverStep1:", error);
      return res.status(500).json({
        status: false,
        error: 1,
        success: 0,
        msg: "Server error",
      });
    }
  });
};
