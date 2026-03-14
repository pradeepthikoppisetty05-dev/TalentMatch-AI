// Run with: npm run migrate
// Creates the database and users table if they don't exist.

import "dotenv/config";
import mysql from "mysql2/promise";

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    timezone: "+00:00",
  });

  const db = process.env.DB_NAME || "talentmatch";

  console.log(`🔧  Running migrations for database: ${db}`);

  // 1️⃣ Create database
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  console.log(`✔ Database '${db}' ready`);

  // 2️⃣ Switch database
  await conn.query(`USE \`${db}\``);

  // 3️⃣ Create users table
  await conn.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      PRIMARY KEY (id),
      UNIQUE KEY uq_users_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  console.log("✔ Table 'users' ready");

  await conn.end();
  console.log("✅ Migration complete");
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err.message);
  process.exit(1);
});