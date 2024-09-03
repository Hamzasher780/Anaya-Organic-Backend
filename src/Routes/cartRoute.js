const express = require('express');
const router = express.Router();
const cartController = require('../Controllers/cartController');

// Get the user's cart
router.get('/:userId', cartController.getCartByUserId);

// Add an item to the cart
router.post('/add', cartController.addToCart);

// Remove an item from the cart
router.delete('/remove', cartController.removeFromCart);
// Update an item in the cart
router.put('/update', cartController.updateCartItem);


module.exports = router;
