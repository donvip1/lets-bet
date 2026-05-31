'use strict';

/*********************************************************
 Author:                Philip Awazie Donvip
 Year Created:          2026
 Description:           Authentication controller for user registration, login, and profile access.
 Modified By:           Philip Awazie Donvip
 Modified Date:         2026-05-31
 Modification Notes:    Added traceable comments for debugging, handoff, undo, and redo review.
*********************************************************/

// ========================================================
// Imports, dependencies, and module setup
// ========================================================

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const User = require("../models/User");
const Wallet = require("../models/Wallet");

const TOKEN_EXPIRY = "7d";

const buildUserResponse = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  kyc_status: user.kyc_status,
});

/**
 * Register a new Lets Bet user, create their wallet through the User model,
 * and return an authentication token.
 *
 * @param {object} req - Express request with email, password, and name in req.body.
 * @param {object} res - Express response used to return the registered user and token.
 * @returns {Promise<object>} JSON response with token and public user data.
 */
const register = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, name } = req.body;

  try {
    const existingUser = await User.findByEmail(email);

    if (existingUser) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const user = await User.createUser(email, password, name);
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: TOKEN_EXPIRY,
    });

    return res.status(201).json({
      token,
      user: buildUserResponse(user),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Authenticate an existing Lets Bet user with email and password.
 *
 * @param {object} req - Express request with email and password in req.body.
 * @param {object} res - Express response used to return the authenticated user and token.
 * @returns {Promise<object>} JSON response with token and public user data.
 */
const login = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const user = await User.findByEmail(email);

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: TOKEN_EXPIRY,
    });

    return res.json({
      token,
      user: buildUserResponse(user),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Return the authenticated user's profile and wallet.
 *
 * @param {object} req - Express request with req.user set by auth middleware.
 * @param {object} res - Express response used to return user and wallet data.
 * @returns {Promise<object>} JSON response with the public user and wallet.
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const wallet = await Wallet.getWalletByUserId(req.user.id);

    return res.json({ user, wallet });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  register,
  login,
  getMe,
};
