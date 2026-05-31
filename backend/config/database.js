'use strict';

/*********************************************************
 Author:                Philip Awazie Donvip
 Year Created:          2026
 Description:           PostgreSQL pool configuration and shared query helper.
 Modified By:           Philip Awazie Donvip
 Modified Date:         2026-05-31
 Modification Notes:    Added traceable comments for debugging, handoff, undo, and redo review.
*********************************************************/

// ========================================================
// Imports, dependencies, and module setup
// ========================================================

const { Pool } = require("pg");
const dotenv = require("dotenv");

// Load environment variables before creating the database pool.
dotenv.config({ quiet: true });

// Keep numeric environment values safe when they are missing or malformed.
const parsePort = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

// Shared pool settings keep connection usage predictable under load.
const sharedPoolConfig = {
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// DATABASE_URL is a full PostgreSQL connection string, so pg expects it as
// connectionString. Otherwise, fall back to individual local dev settings.
const poolConfig = process.env.DATABASE_URL
  ? {
      ...sharedPoolConfig,
      connectionString: process.env.DATABASE_URL,
    }
  : {
      ...sharedPoolConfig,
      host: process.env.DB_HOST || "localhost",
      port: parsePort(process.env.DB_PORT, 5432),
      database: process.env.DB_NAME || "betting_db",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "password",
    };

const databaseUrlRequiresSsl = /sslmode=require/i.test(
  process.env.DATABASE_URL || ""
);
const shouldUseSsl =
  process.env.DB_SSL === "true" || databaseUrlRequiresSsl;

// Railway can provide internal non-SSL URLs or public SSL-required URLs.
// Set DB_SSL=true or include sslmode=require in DATABASE_URL when SSL is needed.
if (shouldUseSsl) {
  poolConfig.ssl = {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false",
  };
}

// Create one reusable PostgreSQL pool for the Lets Bet backend.
const pool = new Pool(poolConfig);

// Surface unexpected idle-client errors so they are visible in server logs.
pool.on("error", (err) => {
  console.error("Pool error:", err);
});

// Central query helper keeps database access consistent across route modules.
const query = async (text, params) => {
  try {
    return await pool.query(text, params);
  } catch (err) {
    console.error("Database query error:", {
      message: err.message,
      code: err.code,
    });
    throw err;
  }
};

module.exports = { pool, query };
