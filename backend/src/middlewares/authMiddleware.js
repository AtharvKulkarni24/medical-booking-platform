const jwt = require("jsonwebtoken");
const { isTokenBlacklisted } = require("../services/redisClient");
const express = require("express");

const app = express();

app.use(express.json()); // Parse JSON bodies

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Token required" });
    }

    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      return res.status(401).json({ error: "Token revoked" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: "Invalid token" });
      }

      req.user = decoded;
      next();
    });

  } catch (err) {
    res.status(500).json({ error: "Auth error" });
  }
};

module.exports = { authenticateToken };