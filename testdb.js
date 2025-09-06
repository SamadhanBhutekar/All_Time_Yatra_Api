// /pages/api/testdb.js  (or app-route equivalent)
import mysql from "mysql2/promise";

export default async function handler(req, res) {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: Number(process.env.DB_PORT || 3306),
    });
    const [rows] = await conn.query("SELECT NOW() as now");
    await conn.end();
    res.json({ ok: true, now: rows[0].now });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
