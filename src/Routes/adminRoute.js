// adminRoute.js
const express = require('express');
const AdminController = require('../Controllers/adminController');
const { adminAuth } = require('../Middleware/authMiddleware');
const router = express.Router();

// Admin login route
router.post('/login', AdminController.loginAdmin);

// Optional: Admin registration route
router.post('/register', AdminController.registerAdmin);
// Route to get admin stats
router.get('/stats', AdminController.getAdminStats);
// New Routes for detailed reports
router.get('/reports/sales', AdminController.getSalesReport);

router.get('/reports/user-activity', AdminController.getUserActivityReport);

router.get('/reports/revenue', AdminController.getRevenueReport);

router.get('/reports/stock', AdminController.getStockReport);
// Route to get categories
router.get('/reports/categories', AdminController.getCategories);

router.get('/reports/revenue', AdminController.getRevenueReport);

// Admin Profile Routes
router.get('/profile', adminAuth, AdminController.getAdminProfile);
router.put('/profile', adminAuth, AdminController.updateAdminProfile);
module.exports = router;
