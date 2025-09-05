const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST, // e.g. containers-us-west-123.railway.app
  user: process.env.DB_USER, // e.g. root
  password: process.env.DB_PASS, // your Railway password
  database: process.env.DB_NAME, // usually "railway"
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
