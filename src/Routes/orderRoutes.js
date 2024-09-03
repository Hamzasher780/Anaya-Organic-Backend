const express = require('express');
const router = express.Router();
const orderController = require('../Controllers/orderController');

// Get all orders
router.get('/', orderController.getAllOrders);

// Get orders by user ID
router.get('/user/:userId', orderController.getOrdersByUserId);

// Get an order by ID
router.get('/order/:id', orderController.getOrderById);

// Create an order from a cart
router.post('/create', orderController.createOrder);

// Update order status
router.put('/:id/status', orderController.updateOrderStatus);

// Delete an order by ID
router.delete('/order/:id', orderController.deleteOrder);

// Update order details
router.put('/:id', orderController.updateOrderDetails);

module.exports = router;
