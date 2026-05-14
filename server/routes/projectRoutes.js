const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const auth = require('../middleware/authMiddleware');

router.get('/', auth, projectController.getAllProjects);
router.post('/', auth, projectController.createProject);
router.patch('/:id/status', auth, projectController.updateProjectStatus);

module.exports = router;
