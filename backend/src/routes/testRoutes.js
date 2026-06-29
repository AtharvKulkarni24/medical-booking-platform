const express = require("express");
const router = express.Router();

const { authenticateToken } = require("../middlewares/authMiddleware");
const testController = require("../controllers/testController");

router.post(
  "/labs/tests",
  authenticateToken,
  testController.createTest
);
router.get(
    "/labs/tests",
    authenticateToken,
    testController.getAllTests
);
router.get(
  "/labs/tests/:id",
  authenticateToken,
  testController.getTestById
);
router.put(
  "/labs/tests/:id",
  authenticateToken,
  testController.updateTest
);

router.delete(
  "/labs/tests/:id",
  authenticateToken,
  testController.deleteTest
);
module.exports = router;