const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getUserProfile, updateUserProfile } = require('../Controllers/userController');
const { auth } = require('../middleware/authMiddleware');

// Route to register a new user
router.post('/register', registerUser);

// Route to login a user and return a JWT
router.post('/login', loginUser);

// Protected route to get user profile
router.get('/profile', auth, getUserProfile);

// Protected route to update user profile
router.put('/profile', auth, updateUserProfile);

module.exports = router;
