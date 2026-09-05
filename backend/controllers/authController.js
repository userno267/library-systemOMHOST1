import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "../db/db.js";
import { refreshForUser } from "../cron/recommendationCron.js";
import { generateVerificationCode, sendVerificationEmail } from "../services/mailer.js";

const CODE_EXPIRY_MINUTES = 10;

async function issueVerificationCode(email) {
  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

  console.log(`[VERIFY-CODE] Issuing code for ${email}: ${code} (expires ${expiresAt.toISOString()})`);

  // Clear any older, unused codes for this email so only the latest is valid.
  const [deleteResult] = await db.query(`DELETE FROM email_verifications WHERE email = ?`, [email]);
  console.log(`[VERIFY-CODE] Cleared ${deleteResult.affectedRows} old code(s) for ${email}`);

  const [insertResult] = await db.query(
    `INSERT INTO email_verifications (email, code, expires_at) VALUES (?, ?, ?)`,
    [email, code, expiresAt]
  );
  console.log(`[VERIFY-CODE] Inserted new code row id=${insertResult.insertId} for ${email}`);

  return code;
}

// ─── Register ─────────────────────────────────────────────────────────────────
export const register = async (req, res) => {
  const { full_name, lrn, email, phone, password } = req.body;

  console.log("=== REGISTER START ===", { full_name, lrn, email, phone });

  if (!full_name || !lrn || !email || !phone || !password) {
    console.log("[REGISTER] Missing required field(s)", {
      full_name: !!full_name,
      lrn: !!lrn,
      email: !!email,
      phone: !!phone,
      password: !!password
    });
    return res.status(400).json({
      success: false,
      message: "All fields are required"
    });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    console.log("[REGISTER] Password hashed OK");

    const [insertResult] = await db.query(
      "INSERT INTO users (full_name, lrn, email, phone, password, is_verified) VALUES (?, ?, ?, ?, ?, 0)",
      [full_name, lrn, email, phone, hashed]
    );
    console.log(`[REGISTER] User row inserted, id=${insertResult.insertId}`);

    const code = await issueVerificationCode(email);

    console.log(`[REGISTER] Attempting to send verification email to ${email}...`);
    console.log("[REGISTER] Mailer env check:", {
      GMAIL_USER: process.env.GMAIL_USER ? `${process.env.GMAIL_USER.slice(0, 3)}***` : "MISSING",
      GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD ? "set (hidden)" : "MISSING",
    });

    try {
      const sendResult = await sendVerificationEmail(email, code);
      console.log("[REGISTER] ✅ sendVerificationEmail resolved:", JSON.stringify(sendResult));
    } catch (mailErr) {
      // Don't fail registration just because the email didn't send —
      // the user can hit "resend code" on the verify screen.
      console.error("[REGISTER] ❌ EMAIL SEND ERROR:");
      console.error("  message:", mailErr.message);
      console.error("  code:", mailErr.code);
      console.error("  command:", mailErr.command);
      console.error("  response:", mailErr.response);
      console.error("  responseCode:", mailErr.responseCode);
      console.error("  full stack:", mailErr.stack);
    }

    console.log("=== REGISTER SUCCESS, sending response ===");
    res.status(201).json({
      success: true,
      message: "Account created. Please check your email for a verification code.",
      email
    });

  } catch (err) {
    // Duplicate entry (MySQL error code)
    if (err.code === "ER_DUP_ENTRY") {
      console.warn("[REGISTER] Duplicate entry:", err.message);

      if (err.message.includes("lrn")) {
        return res.status(409).json({
          success: false,
          message: "LRN already registered"
        });
      }

      if (err.message.includes("email")) {
        return res.status(409).json({
          success: false,
          message: "Email already registered"
        });
      }
    }

    console.error("=== REGISTER ERROR ===");
    console.error("Message:", err.message);
    console.error("Stack:", err.stack);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again."
    });
  }
};

// ─── Verify email code ─────────────────────────────────────────────────────────

export const verifyEmail = async (req, res) => {
  const { email, code } = req.body;

  console.log("=== VERIFY EMAIL START ===", { email, code });

  if (!email || !code) {
    console.log("[VERIFY] Missing email or code");
    return res.status(400).json({
      success: false,
      message: "Email and code are required"
    });
  }

  try {
    const [rows] = await db.query(
      `SELECT * FROM email_verifications
       WHERE email = ? AND code = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [email, code]
    );

    console.log(`[VERIFY] Matching code rows found: ${rows.length}`);

    if (!rows.length) {
      // Extra diagnostic: show what codes DO exist for this email,
      // so you can see if the user is typing an old/expired one.
      const [existing] = await db.query(
        `SELECT code, expires_at, created_at FROM email_verifications WHERE email = ? ORDER BY created_at DESC`,
        [email]
      );
      console.log(`[VERIFY] No match. Existing codes on file for ${email}:`, existing);

      return res.status(400).json({
        success: false,
        message: "Invalid verification code"
      });
    }

    const record = rows[0];
    const now = new Date();
    console.log("[VERIFY] Found record:", record, "| now:", now.toISOString());

    if (new Date(record.expires_at) < now) {
      console.log(`[VERIFY] Code expired at ${record.expires_at}, now is ${now.toISOString()}`);
      return res.status(400).json({
        success: false,
        message: "Code expired. Please request a new one."
      });
    }

    const [updateResult] = await db.query(`UPDATE users SET is_verified = 1 WHERE email = ?`, [email]);
    console.log(`[VERIFY] Users updated: ${updateResult.affectedRows}`);

    const [deleteResult] = await db.query(`DELETE FROM email_verifications WHERE email = ?`, [email]);
    console.log(`[VERIFY] Verification codes cleared: ${deleteResult.affectedRows}`);

    console.log("=== VERIFY EMAIL SUCCESS ===");
    res.json({
      success: true,
      message: "Email verified! You can now log in."
    });

  } catch (err) {
    console.error("=== VERIFY EMAIL ERROR ===");
    console.error("Message:", err.message);
    console.error("Stack:", err.stack);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again."
    });
  }
};

// ─── Resend verification code ───────────────────────────────────────────────────

export const resendCode = async (req, res) => {
  const { email } = req.body;

  console.log("=== RESEND CODE START ===", { email });

  if (!email) {
    console.log("[RESEND] Missing email");
    return res.status(400).json({
      success: false,
      message: "Email is required"
    });
  }

  try {
    const [users] = await db.query(
      `SELECT id, is_verified FROM users WHERE email = ?`,
      [email]
    );

    console.log(`[RESEND] User lookup result:`, users);

    if (!users.length) {
      console.log(`[RESEND] No account found for ${email}`);
      return res.status(404).json({
        success: false,
        message: "No account found with that email"
      });
    }

    if (users[0].is_verified) {
      console.log(`[RESEND] Email ${email} already verified`);
      return res.status(400).json({
        success: false,
        message: "This email is already verified"
      });
    }

    const code = await issueVerificationCode(email);

    console.log(`[RESEND] Attempting to send verification email to ${email}...`);
    console.log("[RESEND] Mailer env check:", {
      GMAIL_USER: process.env.GMAIL_USER ? `${process.env.GMAIL_USER.slice(0, 3)}***` : "MISSING",
      GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD ? "set (hidden)" : "MISSING",
    });

    try {
      const sendResult = await sendVerificationEmail(email, code);
      console.log("[RESEND] ✅ sendVerificationEmail resolved:", JSON.stringify(sendResult));
    } catch (mailErr) {
      console.error("[RESEND] ❌ EMAIL SEND ERROR:");
      console.error("  message:", mailErr.message);
      console.error("  code:", mailErr.code);
      console.error("  command:", mailErr.command);
      console.error("  response:", mailErr.response);
      console.error("  responseCode:", mailErr.responseCode);
      console.error("  full stack:", mailErr.stack);

      // Unlike register(), resend's entire purpose is sending the email,
      // so if it fails here, surface that to the user instead of lying
      // and saying "sent" when it wasn't.
      return res.status(500).json({
        success: false,
        message: "Failed to send verification email. Please try again."
      });
    }

    console.log("=== RESEND CODE SUCCESS ===");
    res.json({
      success: true,
      message: "A new verification code has been sent"
    });

  } catch (err) {
    console.error("=== RESEND CODE ERROR ===");
    console.error("Message:", err.message);
    console.error("Stack:", err.stack);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again."
    });
  }
};

// ─── Login ─────────────────────────────────────────────────────────────────────

export const login = async (req, res) => {
  const { lrn, password } = req.body;

  console.log("=== LOGIN START ===", { lrn });

  if (!lrn || !password) {
    console.log("[LOGIN] Missing lrn or password");
    return res.status(400).json({
      success: false,
      message: "LRN and password are required"
    });
  }

  try {
    const [rows] = await db.query(
      "SELECT * FROM users WHERE lrn = ?",
      [lrn]
    );

    console.log(`[LOGIN] Users found for lrn=${lrn}: ${rows.length}`);

    if (!rows.length) {
      console.log(`[LOGIN] No user with lrn=${lrn}`);
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);

    console.log(`[LOGIN] Password match for user id=${user.id}: ${match}`);

    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    if (!user.is_verified) {
      console.log(`[LOGIN] User id=${user.id} not yet verified`);
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in.",
        needsVerification: true,
        email: user.email
      });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "1d" }
    );

    console.log(`[LOGIN] Token issued for user id=${user.id}, role=${user.role}`);

    // 🔥 Fire-and-forget: warm the recommendation cache in the background.
    // Does NOT block the login response — errors are swallowed inside refreshForUser itself.
    if (user.role === "student") {
      refreshForUser(user.id).catch((err) =>
        console.error(`[LOGIN] refreshForUser background error for user ${user.id}:`, err.message)
      );
    }

    console.log("=== LOGIN SUCCESS ===");
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.full_name,
        role: user.role
      }
    });

  } catch (err) {
    console.error("=== LOGIN ERROR ===");
    console.error("Message:", err.message);
    console.error("Stack:", err.stack);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again."
    });
  }
};