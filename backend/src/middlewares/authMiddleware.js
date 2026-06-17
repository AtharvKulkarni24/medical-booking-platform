const jwt = require("jsonwebtoken");
const { isTokenBlacklisted } = require("../services/redisClient");

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Access token required",
      });
    }

    // Check if token is blacklisted
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      return res.status(401).json({
        success: false,
        error: "Token has been revoked. Please login again.",
      });
    }

    // Verify token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({
          success: false,
          error: "Invalid or expired token",
        });
      }
      req.user = decoded;
      next();
    });
  } catch (error) {
    console.error("Authentication Error:", error);
    res.status(500).json({
      success: false,
      error: "Server error during authentication",
    });
  }
};

module.exports = { authenticateToken };
