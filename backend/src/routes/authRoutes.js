const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Patient Routes
router.post('/patients/register', authController.registerPatient);
router.post('/patients/login', authController.loginPatient);

// Lab Routes
router.post('/labs/register', authController.registerLab);
router.post('/labs/login', authController.loginLab);

// Auth Management Routes
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);

module.exports = router;