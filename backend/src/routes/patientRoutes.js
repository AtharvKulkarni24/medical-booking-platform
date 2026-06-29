const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { authorizeRole } = require('../middlewares/roleMiddleware');

// All patient routes require authentication and patient role
router.use(authenticateToken);
router.use(authorizeRole('patient'));

router.get('/profile', patientController.getPatientProfile);
router.patch('/profile', patientController.updatePatientProfile);
router.patch('/profile/password', patientController.updatePatientPassword);

module.exports = router;