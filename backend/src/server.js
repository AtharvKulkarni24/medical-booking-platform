//backend/src/server.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const authRoutes = require("./routes/authRoutes");
const patientRoutes=require('./routes/patientRoutes');
const searchRoutes=require('./routes/searchRoutes');

//Import the database connection pool
const db = require("./config/db");

//Import Redis client
const { initRedis } = require("./services/redisClient");

const app = express();

// ----Middleware----
// Allows request from our Vite React Frontend
app.use(cors());
//Parse incoming JSON payloads in the request body
app.use(express.json());

//----Routes---

app.use("/api/auth", authRoutes);
app.use('/api/patients',patientRoutes);
app.use('/api/search',searchRoutes);
;

// --- Server Initialization ---
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Initialize Redis connection (may return null if unavailable)
    const redisClient = await initRedis();
    if (redisClient) {
      console.log("Redis connected successfully");
    } else {
      console.warn(
        "Redis not available; starting with in-memory blacklist fallback.",
      );
    }

    app.listen(PORT, () => {
      console.log("Server is running on http://localhost:" + PORT);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
