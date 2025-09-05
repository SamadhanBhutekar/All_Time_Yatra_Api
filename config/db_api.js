const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST, // e.g. yourdomain.mysqlhost.com
  user: process.env.DB_USER, // DB username
  password: process.env.DB_PASS, // DB password
  database: process.env.DB_NAME, // DB name
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
