const jwt = require("jsonwebtoken");
const { isTokenBlacklisted } = require("../services/redisClient");

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"] || req.headers["Authorization"];
    
    if (!authHeader || typeof authHeader !== 'string') {
      return res.status(401).json({ success: false, error: "Access token is missing or malformed" });
    }

    // FIX: Properly extract the token string
    const token = authHeader.split(" ")[1];

    if (!token || typeof token !== 'string' || token === 'null' || token === 'undefined') {
      return res.status(401).json({ success: false, error: "Invalid token format in header" });
    }

    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      return res.status(401).json({ success: false, error: "Token has been revoked. Please log in again." });
    }

    const secret = process.env.JWT_SECRET || 'super_secret_access_key';

    jwt.verify(token, secret, (err, decoded) => {
      if (err) {
        console.error("JWT Verification Failed:", err.message);
        return res.status(403).json({ success: false, error: "Invalid or expired access token" });
      }

      req.user = decoded;
      next();
    });

  } catch (err) {
    console.error("Middleware Auth Error:", err);
    res.status(500).json({ success: false, error: "Internal server authentication error" });
  }
};

module.exports = { authenticateToken };