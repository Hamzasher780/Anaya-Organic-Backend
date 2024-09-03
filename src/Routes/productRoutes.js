const express = require('express');
const router = express.Router();
const productController = require('../Controllers/productController');

// Get all products
router.get('/', productController.getAllProducts);

// Get a product by ID
router.get('/:id', productController.getProductById);

// Create a new product with file upload
router.post('/', productController.upload, productController.createProduct);

// Update a product by ID with file upload
router.put('/:id', productController.upload, productController.updateProduct);

// Delete a product by ID
router.delete('/:id', productController.deleteProduct);

module.exports = router;
