const express = require("express");
const router = express.Router();

const { authenticateToken } = require("../middlewares/authMiddleware");
const {authorizeRole}=require("../middlewares/roleMiddleware")
const labController = require("../controllers/labController");


// All patient routes require authentication and patient role
router.use(authenticateToken);
router.use(authorizeRole('lab'));

// The base path '/api/labs' will be defined in server.js
router.get("/profile", authenticateToken, labController.getLabProfile);
router.put("/profile", authenticateToken, labController.updateLabProfile);
router.patch("/profile/password", labController.updateLabPassword);

module.exports = router;