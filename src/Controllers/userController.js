const User = require('../Models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Function to generate a JWT token
const generateToken = (user) => {
  return jwt.sign({ id: user._id, username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
};

// Register a new user
exports.registerUser = async (req, res) => {
  const { username, email, password, role } = req.body;

  try {
    // Check if the user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role: role || 'user'
    });

    // Save the new user to the database
    await newUser.save();

    // Generate a JWT token
    const token = generateToken(newUser);

    // Include the token in the response
    res.status(201).json({ 
      msg: 'User registered successfully', 
      authToken: token,  // Include the token in the response
      username: newUser.username, 
      role: newUser.role, 
      userId: newUser._id  // Include userId in the response
    });
  } catch (err) {
    console.error('Error during user registration:', err);
    res.status(500).send('Server Error');
  }
};

// Login an existing user
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid Credentials - User not found' });
    }

    // Compare the provided password with the hashed password in the database
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials - Password does not match' });
    }

    // Generate a JWT token
    const token = generateToken(user);

    // Include the token in the response
    res.json({ 
      msg: 'Login successful', 
      authToken: token,  // Include the token in the response
      username: user.username, 
      role: user.role, 
      userId: user._id  // Include userId in the response
    });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).send('Server Error');
  }
};

// Get User Profile
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).send('Server Error');
  }
};

// Update User Profile
exports.updateUserProfile = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const user = await User.findById(req.user.id);

    if (user) {
      user.username = username || user.username;
      user.email = email || user.email;

      if (password) {
        user.password = await bcrypt.hash(password, 10);
      }

      await user.save();

      res.json({ msg: 'Profile updated successfully' });
    } else {
      res.status(404).json({ msg: 'User not found' });
    }
  } catch (err) {
    console.error('Error updating user profile:', err);
    res.status(500).send('Server Error');
  }
};
