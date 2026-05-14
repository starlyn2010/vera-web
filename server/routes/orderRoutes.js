const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const auth = require('../middleware/authMiddleware');

router.use(auth);

router.post('/', orderController.createOrder);
router.get('/history', orderController.getOrderHistory);
router.get('/:id', orderController.getOrderDetails);
router.delete('/:id', orderController.cancelOrder);

module.exports = router;
