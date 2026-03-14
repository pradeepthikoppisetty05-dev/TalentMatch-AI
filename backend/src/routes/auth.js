import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db/tempconnection.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ── POST /api/auth/register ───────────────────────────────────────────────────

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  // Validation
  if (!name?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ error: "Name, email, and password are required." });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Please provide a valid email address." });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }

  if (name.trim().length < 2) {
    return res.status(400).json({ error: "Name must be at least 2 characters." });
  }

  try {
    // Check if email already exists
    const [existing] = await pool.execute(
      "SELECT id FROM users WHERE email = ?",
      [email.toLowerCase().trim()]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    // Hash password (salt rounds: 12)
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insert user
    const [result] = await pool.execute(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name.trim(), email.toLowerCase().trim(), hashedPassword]
    );

    const newUser = { id: result.insertId, name: name.trim(), email: email.toLowerCase().trim() };
    const token = generateToken(newUser);

    return res.status(201).json({
      message: "Account created successfully.",
      token,
      user: newUser,
    });
  } catch (err) {
    console.error("[POST /api/auth/register]", err.message);
    return res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email?.trim() || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    // Fetch user by email
    const [rows] = await pool.execute(
      "SELECT id, name, email, password FROM users WHERE email = ?",
      [email.toLowerCase().trim()]
    );

    // Use a generic message to avoid revealing whether the email exists
    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const user = rows[0];

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const safeUser = { id: user.id, name: user.name, email: user.email };
    const token = generateToken(safeUser);

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: safeUser,
    });
  } catch (err) {
    console.error("[POST /api/auth/login]", err.message);
    return res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
// Returns the current user from the token — useful for session restoration

router.get("/me", authenticate, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, name, email, created_at FROM users WHERE id = ?",
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    return res.status(200).json({ user: rows[0] });
  } catch (err) {
    console.error("[GET /api/auth/me]", err.message);
    return res.status(500).json({ error: "Could not fetch user." });
  }
});

export default router;