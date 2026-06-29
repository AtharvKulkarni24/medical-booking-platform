const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const db = require("../config/db");
exports.registerLab = async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required."
      });
    }

    // Check if lab already exists
    const existingLab = await db.query(
      "SELECT id FROM labs WHERE email = $1",
      [email]
    );

    if (existingLab.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Lab already registered."
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert lab
    const result = await db.query(
      `INSERT INTO labs
      (name, email, password_hash, phone, address)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, email, phone, address`,
      [
        name,
        email,
        hashedPassword,
        phone,
        address
      ]
    );

    res.status(201).json({
      success: true,
      message: "Lab registered successfully.",
      lab: result.rows[0]
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};



exports.loginLab = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required."
      });
    }

    // Find lab
    const result = await db.query(
      "SELECT * FROM labs WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    const lab = result.rows[0];

    // Compare password
    const isMatch = await bcrypt.compare(password, lab.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: lab.id,
        email: lab.email,
        role: "lab"
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d"
      }
    );

    res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      lab: {
        id: lab.id,
        name: lab.name,
        email: lab.email
      }
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};