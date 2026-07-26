require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser"); 

// --- Import Database & Services ---
const db = require("./config/db");
const { initRedis } = require("./services/redisClient");

// --- Import Routes ---
const authRoutes = require("./routes/authRoutes");
const patientRoutes = require("./routes/patientRoutes");
const searchRoutes = require("./routes/searchRoutes");
const labRoutes = require("./routes/labRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const reviewRoutes = require("./routes/reviewRoutes");

const app = express();

// ==========================================
// 1. GLOBAL MIDDLEWARE
// ==========================================
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow during transition or restrict to allowedOrigins
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ==========================================
// 2. ROUTE MOUNTING
// ==========================================
app.use("/api", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/labs", labRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/reviews", reviewRoutes);

// ==========================================
// 3. 404 CATCH-ALL
// ==========================================
app.use((req, res) => {
  res.status(404).json({ success: false, message: "API Route not found." });
});

// ==========================================
// 4. EXPORT FOR TESTING
// ==========================================
// We export the configured app BEFORE starting it so testing suites can import it safely.
module.exports = app;

// ==========================================
// 5. SERVER INITIALIZATION
// ==========================================
// ONLY start the server if this file is run directly (e.g., `node server.js`)
if (require.main === module) {
  const PORT = process.env.PORT || 5000;

  const startServer = async () => {
    try {
      // Initialize Redis strictly. If it fails, it should throw an error, not fall back.
      await initRedis();
      console.log("🟢 Redis connected successfully");

      app.listen(PORT, () => {
        console.log(`🚀 Server is running securely on http://localhost:${PORT}`);
      });
    } catch (error) {
      console.error("🔴 Fatal Error during startup. Server halted:", error.message);
      process.exit(1); // Exit the process if critical services (like Redis) are down
    }
  };

  startServer();
}