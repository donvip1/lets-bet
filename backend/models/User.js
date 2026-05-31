'use strict';

/*********************************************************
 Author:                Philip Awazie Donvip
 Year Created:          2026
 Description:           Database model helpers for users, password hashing, and KYC status.
 Modified By:           Philip Awazie Donvip
 Modified Date:         2026-05-31
 Modification Notes:    Added traceable comments for debugging, handoff, undo, and redo review.
*********************************************************/

// ========================================================
// Imports, dependencies, and module setup
// ========================================================

const bcrypt = require("bcryptjs");
const { pool, query } = require("../config/database");

// Public user fields are kept in one place so password hashes are never returned by mistake.
const PUBLIC_USER_FIELDS = `
  id,
  email,
  name,
  kyc_status,
  created_at
`;

/**
 * Create a Lets Bet user and their wallet balances in one database transaction.
 *
 * @param {string} email - User email address used for login and account identity.
 * @param {string} password - Plain-text password to hash before storing.
 * @param {string} name - User display name.
 * @returns {Promise<{id: number, email: string, name: string, kyc_status: string, created_at: Date}>} Newly created user without password_hash.
 * @throws {Error} Throws "Email already exists" when the users email unique constraint fails.
 */
const createUser = async (email, password, name) => {
  const client = await pool.connect();

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    await client.query(`BEGIN`);

    // Store only the bcrypt hash, never the raw password.
    const insertedUser = await client.query(
      `
        INSERT INTO users (email, password_hash, name)
        VALUES ($1, $2, $3)
        RETURNING id
      `,
      [email, passwordHash, name]
    );

    const userId = insertedUser.rows[0].id;

    // Every new betting account starts with zero balances across supported wallets.
    await client.query(
      `
        INSERT INTO wallets (
          user_id,
          balance_ngn,
          balance_usd,
          balance_btc,
          balance_eth
        )
        VALUES ($1, $2, $3, $4, $5)
      `,
      [userId, 0, 0, 0, 0]
    );

    // Read the final user shape from the database after related setup completes.
    const userResult = await client.query(
      `
        SELECT ${PUBLIC_USER_FIELDS}
        FROM users
        WHERE id = $1
      `,
      [userId]
    );

    await client.query(`COMMIT`);

    return userResult.rows[0];
  } catch (err) {
    try {
      await client.query(`ROLLBACK`);
    } catch (rollbackErr) {
      console.error("User creation rollback failed:", rollbackErr);
    }

    if (err.code === "23505") {
      throw new Error("Email already exists");
    }

    console.error("Create user error:", {
      message: err.message,
      code: err.code,
    });
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Find a user by email for authentication flows.
 *
 * @param {string} email - Email address to search for.
 * @returns {Promise<object|null>} Matching user row including password_hash, or null when no user exists.
 */
const findByEmail = async (email) => {
  const result = await query(
    `
      SELECT *
      FROM users
      WHERE email = $1
    `,
    [email]
  );

  return result.rows[0] || null;
};

/**
 * Find a user by id without exposing password data.
 *
 * @param {number|string} id - User id to search for.
 * @returns {Promise<object|null>} Public user row, or null when no user exists.
 */
const findById = async (id) => {
  const result = await query(
    `
      SELECT
        id,
        email,
        name,
        kyc_status,
        is_active,
        created_at
      FROM users
      WHERE id = $1
    `,
    [id]
  );

  return result.rows[0] || null;
};

/**
 * Update a user's KYC status.
 *
 * @param {number|string} userId - User id whose KYC status should be updated.
 * @param {string} status - New KYC status value.
 * @returns {Promise<object|null>} Updated user row, or null when no matching user exists.
 */
const updateKYCStatus = async (userId, status) => {
  const result = await query(
    `
      UPDATE users
      SET kyc_status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING
        id,
        email,
        name,
        kyc_status,
        is_active,
        created_at,
        updated_at
    `,
    [status, userId]
  );

  return result.rows[0] || null;
};

module.exports = {
  createUser,
  findByEmail,
  findById,
  updateKYCStatus,
};
