const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const auth = require('../middleware/authMiddleware');

router.use(auth);

router.get('/', reportController.getReports);
router.post('/generate', reportController.generateReport);
router.post('/', reportController.generateReport);


module.exports = router;
