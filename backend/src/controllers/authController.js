const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const {
  blacklistToken,
  storeRefreshToken,
  getRefreshToken,
  revokeRefreshToken,
} = require("../services/redisClient");

// Generate short-lived access token
const generateAccessToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m",
  });
};

// Generate long-lived refresh token
const generateRefreshToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
    },
  );
};

// --- PATIENT REGISTRATION ---

exports.registerPatient = async (req, res) => {
  try {
    const { name, email, password, phone_number } = req.body;

    //Basic validation
    if (!name || !email || !password || !phone_number) {
      return res
        .status(400)
        .json({ success: false, error: "Please provide all required fields." });
    }

    //Check if the patient already exists
    const userCheck = await db.query("SELECT * FROM patients WHERE email=$1", [
      email,
    ]);
    if (userCheck.rows.length > 0) {
      return res
        .status(400)
        .json({ success: false, error: "Email is already registered." });
    }

    //Hash the password securely
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    //Insert the new patient into the database
    const insertQuery = `
            INSERT INTO patients (name,email,password_hash,phone_number) 
            VALUES ($1,$2,$3,$4) 
            RETURNING patient_id,name,email;`;
    const newUser = await db.query(insertQuery, [
      name,
      email,
      passwordHash,
      phone_number,
    ]);
    const patient = newUser.rows[0];

    //Generate access and refresh tokens
    const accessToken = generateAccessToken(patient.patient_id, "patient");
    const refreshToken = generateRefreshToken(patient.patient_id, "patient");

    // Store refresh token
    await storeRefreshToken(patient.patient_id, refreshToken);

    //Send the success response
    res.status(201).json({
      success: true,
      message: "Patient registers successfully",
      accessToken,
      refreshToken,
      patient: {
        id: patient.patient_id,
        name: patient.name,
        email: patient.email,
      },
    });
  } catch (error) {
    console.error("Patient Registration Error:", error);
    res
      .status(500)
      .json({ success: false, error: "Server error during registration." });
  }
};

// --- PATIENT LOGIN ---

exports.loginPatient = async (req, res) => {
  try {
    const { email, password } = req.body;

    //Basic validation
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, error: "Please provide email and password." });
    }

    // find patient in the database
    const userQuery = await db.query("SELECT * FROM patients WHERE email=$1", [
      email,
    ]);

    if (userQuery.rows.length == 0) {
      //We use the same error message for both cases to avoid giving hints to potential attackers
      return res
        .status(401)
        .json({ success: false, error: "Invalid email or password." });
    }

    const patient = userQuery.rows[0];

    //verify the password
    const isMatch = await bcrypt.compare(password, patient.password_hash);

    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid email or password." });
    }

    // Generate access and refresh tokens
    const accessToken = generateAccessToken(patient.patient_id, "patient");
    const refreshToken = generateRefreshToken(patient.patient_id, "patient");

    // Store refresh token
    await storeRefreshToken(patient.patient_id, refreshToken);

    res.status(200).json({
      success: true,
      message: "Login successful",
      accessToken,
      refreshToken,
      patient: {
        id: patient.patient_id,
        name: patient.name,
        email: patient.email,
      },
    });
  } catch (error) {
    console.error("Patient Login Error:", error);
    res
      .status(500)
      .json({ success: false, error: "Server error during login." });
  }
};

// --- PATIENT LOGOUT ---

exports.logoutPatient = async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    const patientId = req.user.id;

    if (token) {
      // Verify token validity before blacklisting
      try {
        jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        return res.status(400).json({
          success: false,
          error: "Invalid or expired token.",
        });
      }

      // Calculate remaining expiry time
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp) {
        const expiresIn = Math.max(
          decoded.exp - Math.floor(Date.now() / 1000),
          0,
        );

        // Blacklist the access token
        await blacklistToken(token, expiresIn);
      }
    }

    // Revoke all refresh tokens for this patient
    await revokeRefreshToken(patientId);

    res.status(200).json({
      success: true,
      message: "Logout successful. All tokens have been invalidated.",
    });
  } catch (error) {
    console.error("Patient Logout Error:", error);
    res
      .status(500)
      .json({ success: false, error: "Server error during logout." });
  }
};

// --- LAB REGISTRATION ---
exports.registerLab = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      address_text,
      latitude,
      longitude,
      auth_document_url,
    } = req.body;

    // Basic Validation

    if (
      !name ||
      !email ||
      !password ||
      !address_text ||
      !latitude ||
      !longitude ||
      !auth_document_url
    ) {
      return res.status(400).json({
        success: false,
        error: "Please provide all required fields, including coordinates.",
      });
    }

    //Check if the lab already exists
    const labCheck = await db.query("SELECT * FROM labs WHERE email=$1", [
      email,
    ]);
    if (labCheck.rows.length > 0) {
      return res
        .status(400)
        .json({ success: false, error: "Email is already registered." });
    }

    // Hash the password securely

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert into database with PostGIS geometry
    const insertQuery = `INSERT INTO labs (name,email,password_hash,address_text,location_coordinates,auth_document_url,is_verified)
        VALUES ($1,$2,$3,$4,ST_SetSRID(ST_MakePoint($5,$6),4326)::geography,$7,FALSE)
        RETURNING lab_id,name,email,is_verified;
        `;

    const newLab = await db.query(insertQuery, [
      name,
      email,
      passwordHash,
      address_text,
      longitude,
      latitude,
      auth_document_url,
    ]);

    const lab = newLab.rows[0];

    res.status(201).json({
      success: true,
      message:
        "Lab registered successfully. Please wait for admin verification before attempting to login. You will receive a confirmation email once your auth_document_url has been verified.",
      lab: {
        id: lab.lab_id,
        name: lab.name,
        email: lab.email,
        is_verified: lab.is_verified,
      },
    });
  } catch (error) {
    console.error("Lab Registration Error:", error);
    res
      .status(500)
      .json({ success: false, error: "Server error during lab registration." });
  }
};

// --- LAB LOGIN ---
exports.loginLab = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, error: "Please provide email and password." });
    }

    //Find the lab in the database
    const labQuery = await db.query("SELECT * FROM labs WHERE email=$1", [
      email,
    ]);
    if (labQuery.rows.length == 0) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid email or password." });
    }

    const lab = labQuery.rows[0];

    //If the lab is not verified ,block the logn immediately

    if (lab.is_verified == false) {
      return res.status(403).json({
        success: false,
        error:
          "Your acount is pending manual verification.You cannot login until your documents are approved.",
      });
    }

    // Verify the password (only happens if they are verfied)

    const isMatch = await bcrypt.compare(password, lab.password_hash);

    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid email or password." });
    }

    // Generate access and refresh tokens
    const accessToken = generateAccessToken(lab.lab_id, "lab");
    const refreshToken = generateRefreshToken(lab.lab_id, "lab");

    // Store refresh token
    await storeRefreshToken(lab.lab_id, refreshToken);

    res.status(200).json({
      success: true,
      message: "Lab Login successful",
      accessToken,
      refreshToken,
      lab: {
        id: lab.lab_id,
        name: lab.name,
        email: lab.email,
      },
    });
  } catch (error) {
    console.error("Lab Login error:", error);
    res
      .status(500)
      .json({ success: false, error: "Server error during lab login." });
  }
};

// --- LAB LOGOUT ---
exports.logoutLab = async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    const labId = req.user.id;

    if (token) {
      // Verify token validity before blacklisting
      try {
        jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        return res.status(400).json({
          success: false,
          error: "Invalid or expired token.",
        });
      }

      // Calculate remaining expiry time
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp) {
        const expiresIn = Math.max(
          decoded.exp - Math.floor(Date.now() / 1000),
          0,
        );

        // Blacklist the access token
        await blacklistToken(token, expiresIn);
      }
    }

    // Revoke all refresh tokens for this lab
    await revokeRefreshToken(labId);

    res.status(200).json({
      success: true,
      message: "Logout successful. All tokens have been invalidated.",
    });
  } catch (error) {
    console.error("Lab Logout Error:", error);
    res
      .status(500)
      .json({ success: false, error: "Server error during logout." });
  }
};

// --- REFRESH TOKEN ENDPOINT ---
exports.refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: "Refresh token is required.",
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET,
      );
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: "Invalid or expired refresh token.",
      });
    }

    // Check if refresh token is stored (not revoked)
    const storedToken = await getRefreshToken(decoded.id);
    if (!storedToken || storedToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        error: "Refresh token has been revoked. Please login again.",
      });
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(decoded.id, decoded.role);

    res.status(200).json({
      success: true,
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error("Token Refresh Error:", error);
    res
      .status(500)
      .json({ success: false, error: "Server error during token refresh." });
  }
};
