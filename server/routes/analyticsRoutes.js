const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const auth = require('../middleware/authMiddleware');

router.use(auth);

router.get('/environmental', analyticsController.getEnvironmentalSummary);
router.get('/sales', analyticsController.getSalesStats);

module.exports = router;
