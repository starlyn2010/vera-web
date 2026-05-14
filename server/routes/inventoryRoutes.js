const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const auth = require('../middleware/authMiddleware');

router.use(auth);

router.get('/', inventoryController.getAllProducts);
router.get('/:id', inventoryController.getProductById);
router.post('/', inventoryController.createProduct);

module.exports = router;
