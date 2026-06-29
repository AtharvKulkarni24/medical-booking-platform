require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

// --- Initialize Express ---
const app = express();

// --- Import Database & Services ---
const db = require("./config/db");
const { initRedis } = require("./services/redisClient");

// --- Import Routes ---
const authRoutes = require("./routes/authRoutes");
const patientRoutes = require("./routes/patientRoutes");
const searchRoutes = require("./routes/searchRoutes");
const labRoutes = require("./routes/labRoutes");
const testRoutes = require("./routes/testRoutes");

// ==========================================
// 1. GLOBAL MIDDLEWARE
// ==========================================

// Allows requests from our Vite React Frontend
app.use(cors({
  origin: "http://localhost:5173", 
  credentials: true
}));

app.use(cookieParser());
app.use(express.json());

// ==========================================
// 2. ROUTE MOUNTING
// ==========================================

// Auth Routes (/api/patients/login, etc.)
app.use("/api", authRoutes);

// Patient Profile Routes
app.use("/api/patients", patientRoutes);

// Search Routes
app.use("/api/search", searchRoutes);

// Lab Profile Routes
app.use("/api/labs", labRoutes);

// Lab Test Catalog Routes
app.use("/api/labs/tests", testRoutes);

// ==========================================
// 3. HEALTH CHECK
// ==========================================

app.get("/api/health", async (req, res) => {
  try {
    const result = await db.query("SELECT NOW()");
    res.status(200).json({
      success: true,
      message: "Medical Platform API is running smoothly!",
      database_time: result.rows.now,
    });
  } catch (error) {
    console.error("Database Connection Error:", error);
    res.status(500).json({ success: false, message: "Database connection failed." });
  }
});

// Catch-all for undefined routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: "API Route not found." });
});

// ==========================================
// 4. SERVER INITIALIZATION
// ==========================================

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    const redisClient = await initRedis();
    if (redisClient) {
      console.log("🟢 Redis connected successfully");
    } else {
      console.warn("🟡 Redis not available; starting with in-memory blacklist fallback.");
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server is running securely on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("🔴 Failed to start server:", error);
    process.exit(1);
  }
};

startServer();