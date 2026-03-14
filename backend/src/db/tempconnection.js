import mysql from "mysql2/promise";

// Create a connection pool (reuses connections, handles reconnects)
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "talentmatch",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "+00:00",
});

// Test the connection on startup
export async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log("✅  MySQL connected successfully");
    conn.release();
  } catch (err) {
    console.error("❌  MySQL connection failed:", err.message);
    process.exit(1);
  }
}

export default pool;