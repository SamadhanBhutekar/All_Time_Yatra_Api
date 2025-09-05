const db = require("../config/db_api");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "drivers_kyc");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(
      null,
      `${Date.now()}_${file.fieldname}_${Math.round(Math.random() * 1e9)}${ext}`
    );
  },
});

// Multer instance without size limit
const upload = multer({
  storage,
  limits: {}, // no limit
});

exports.registerDriverStep4 = [
  upload.fields([
    { name: "driver_vehicle_photo" },
    { name: "driver_vehicle_licence" },
    { name: "driver_vehicle_rc" },
  ]),

  async (req, res) => {
    try {
      const driver_mobile = req.body.driver_mobile;
      if (!driver_mobile) {
        return res
          .status(400)
          .json({ status: false, msg: "Driver Mobile No is required" });
      }

      const imageFields = [
        "driver_vehicle_photo",
        "driver_vehicle_licence",
        "driver_vehicle_rc",
      ];
      const uploadedPaths = {};

      // Save uploaded files if present
      imageFields.forEach((field) => {
        if (req.files && req.files[field] && req.files[field][0]) {
          uploadedPaths[field] =
            "userapi/drivers_kyc/" + req.files[field][0].filename;
        } else if (req.body[field]) {
          uploadedPaths[field] = req.body[field]; // optional: existing URL
        }
      });

      // Update DB if new uploads
      if (Object.keys(uploadedPaths).length > 0) {
        const updateParts = Object.entries(uploadedPaths).map(
          ([key]) => `${key} = ?`
        );
        const sql = `UPDATE one_way_drivers SET ${updateParts.join(
          ", "
        )}, updated_at = NOW(), registration_status = 1 WHERE driver_mobile = ?`;
        const params = [...Object.values(uploadedPaths), driver_mobile];
        await db.query(sql, params);
      }

      const [rows] = await db.query(
        "SELECT * FROM one_way_drivers WHERE driver_mobile = ? LIMIT 1",
        [driver_mobile]
      );

      if (rows.length === 0)
        return res.status(404).json({ status: false, msg: "Driver not found" });

      const driverData = rows[0];

      // Remove unwanted fields
      delete driverData.total_gst_paid;
      delete driverData.approved;
      delete driverData.gst_total_amount;
      delete driverData.document_status;
      delete driverData.registration_status;

      // Override DB values with uploaded paths
      imageFields.forEach((field) => {
        driverData[field] = uploadedPaths[field] || driverData[field] || null;
      });

      return res.status(200).json({
        status: true,
        msg: Object.keys(uploadedPaths).length
          ? "Registration successfully"
          : "No new files uploaded, returning existing data",
        driver_data: driverData,
      });
    } catch (err) {
      console.error("Error in registerDriverStep4:", err);
      return res.status(500).json({ status: false, msg: "Server error" });
    }
  },
];
