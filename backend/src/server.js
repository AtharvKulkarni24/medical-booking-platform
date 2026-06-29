const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();   // ✅ Move this here

const authRoutes = require("./routes/authRoutes");
const testRoutes = require("./routes/testRoutes");
 
 const labDashboardRoutes = require("./routes/labDashboardRoutes");

app.use("/api/labs", labDashboardRoutes);

const db = require("./config/db");
const { initRedis } = require("./services/redisClient");

// ----Middleware----
// Allows request from our Vite React Frontend
app.use(cors());
//Parse incoming JSON payloads in the request body
app.use(express.json());

//----Routes---
app.use("/api/auth", authRoutes);
app.use("/api/auth", testRoutes);
 

// ---Health Check Route ---
// A simple route to test if the server and database are alive
app.get("/api/health", async (req, res) => {
  try {
    //Run a tiny query against the database
    const result = await db.query("SELECT NOW()");
    res.status(200).json({
      success: true,
      message: "Medical Platform API is running smoothly!",
      database_time: result.rows[0].now,
    });
  } catch (error) {
    console.log("Database Connection Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Database connection failed." });
  }
});

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
