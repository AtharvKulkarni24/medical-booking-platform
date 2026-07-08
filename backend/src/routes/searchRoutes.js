const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');

// 1. Directory search (Must go before dynamic :lab_id)
router.get('/labs/directory', searchController.searchLabDirectory);
router.get('/labs', searchController.searchLabs);

// 2. NEW: Get a single lab and all its tests
router.get('/labs/:lab_id', searchController.getSingleLabDetails);

// 3. Get a specific test's time slots (Must go last)
router.get('/labs/:lab_id/tests/:test_id', searchController.getLabTestDetails);

module.exports = router;