const express = require("express");
const router = express.Router();

const {
  getLabProfile,
  updateLabProfile,
} = require("../controllers/labDashboardController");

const authMiddleware = require("../middlewares/authMiddleware");

router.get("/profile", authMiddleware, getLabProfile);
router.put("/profile", authMiddleware, updateLabProfile);

module.exports = router;