const User = require('../Models/user');
const Order = require('../Models/order');
const Product = require('../Models/products');
const UserActivity = require('../Models/user-activity');
const Revenue = require('../Models/revenue'); // Adjust the path to your actual model file

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Helper function to generate JWT token
const generateToken = (user) => {
  return jwt.sign({ id: user._id, username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
};

// Admin Login
exports.loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log('Admin login attempt with email:', email);

    const admin = await User.findOne({ email, role: 'admin' });
    if (!admin) {
      console.log('Admin not found');
      return res.status(400).json({ msg: 'Invalid Credentials - Admin not found' });
    }

    console.log('Admin found:', admin);

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      console.log('Password does not match');
      return res.status(400).json({ msg: 'Invalid Credentials - Password does not match' });
    }

    console.log('Password match successful');

    const token = generateToken(admin);
    res.cookie('token', token, { httpOnly: true });

    // Send token in response
    res.json({ msg: 'Admin login successful', username: admin.username, role: admin.role, token });
  } catch (err) {
    console.log('Error during admin login:', err);
    res.status(500).send('Server Error');
  }
};


// Admin Registration (Optional, if you want admins to be able to register)
exports.registerAdmin = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ msg: 'Admin already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = new User({
      username,
      email,
      password: hashedPassword,
      role: 'admin'
    });

    await newAdmin.save();

    const token = generateToken(newAdmin);
    res.cookie('token', token, { httpOnly: true });
    res.status(201).json({ msg: 'Admin registered successfully', username: newAdmin.username, role: newAdmin.role });
  } catch (err) {
    console.log('Error during admin registration:', err);
    res.status(500).send('Server Error');
  }
};

// Function to get admin statistics
exports.getAdminStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalRevenueResult = await Order.aggregate([
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);
    const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].total : 0;

    const recentOrders = await Order.find()
      .populate('user', 'username email')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      totalOrders,
      totalUsers,
      totalProducts,
      totalRevenue,
      recentOrders
    });
  } catch (err) {
    console.error('Error fetching admin stats:', err);
    res.status(500).json({ message: 'Failed to fetch admin stats' });
  }
};

// Fetch real sales data
exports.getSalesReport = async (req, res) => {
  try {
    // Example data, replace with your actual database queries or aggregation logic
    const salesData = await Order.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalOrders: { $sum: 1 },
          totalSales: { $sum: "$totalAmount" }
        }
      }
    ]);

    const formattedSalesData = salesData.map(sale => ({
      date: sale._id,
      totalOrders: sale.totalOrders,
      totalSales: sale.totalSales
    }));

    res.json(formattedSalesData);
  } catch (err) {
    console.error('Error fetching sales report:', err);
    res.status(500).json({ message: 'Failed to fetch sales report' });
  }
};


// Fetch real user activity data
exports.getUserActivityReport = async (req, res) => {
  try {
      const { start, end } = req.query;
      const filter = {};

      // Check if both start and end dates are provided
      if (start && end) {
          filter.date = {
              $gte: new Date(start),
              $lte: new Date(end)
          };
      }

      // Fetch user activities based on the filter
      const userActivities = await UserActivity.find(filter)
          .populate('user', 'username')
          .sort({ date: -1 });

      if (!userActivities) {
          return res.status(404).json({ message: 'No user activities found' });
      }

      // Return the filtered user activities
      res.json(userActivities.map(activity => ({
          user: activity.user ? activity.user.username : 'Unknown User',
          activityType: activity.type,
          date: activity.date
      })));
  } catch (err) {
      console.error('Error fetching user activity report:', err);
      res.status(500).json({ message: 'Failed to fetch user activity report' });
  }
};


// Fetch real revenue data
exports.getRevenueReport = async (req, res) => {
  try {
    const { start, end } = req.query;
    const filter = {};

    // Check if both start and end dates are provided
    if (start && end) {
      filter.date = {
        $gte: new Date(start),
        $lte: new Date(end)
      };
    }

    // Fetch revenue data based on the filter
    const revenueData = await Revenue.find(filter).sort({ date: -1 });

    if (!revenueData) {
      console.error('No revenue data found');
      return res.status(404).json({ message: 'No revenue data found' });
    }

    // Return the revenue data with correctly formatted dates
    res.json(
      revenueData.map(item => ({
        date: item.date.toISOString(), // Ensure date is in a standard format
        totalRevenue: item.totalRevenue
      }))
    );
  } catch (err) {
    console.error('Error fetching revenue report:', err); // Improved error logging
    res.status(500).json({ message: 'Failed to fetch revenue report' });
  }
};

// Fetch real stock data
exports.getStockReport = async (req, res) => {
  try {
    const { category, productName } = req.query;

    // Build a filter object based on the query parameters
    const filter = {};
    if (category) {
      filter.category = category;
    }
    if (productName) {
      filter.name = { $regex: productName, $options: 'i' }; // Case-insensitive search
    }

    const products = await Product.find(filter, 'name category stock');

    // Transform data to match frontend expectation
    const stockData = products.map(product => ({
      productName: product.name,
      category: product.category,
      stockQuantity: product.stock
    }));

    res.json(stockData);
  } catch (err) {
    console.error('Error fetching stock report:', err);
    res.status(500).json({ message: 'Failed to fetch stock report' });
  }
};

// Function to get distinct product categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Product.distinct('category'); // Fetch distinct categories from Product collection
    res.json(categories);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
};







// Fetch Admin Profile
exports.getAdminProfile = async (req, res) => {
  try {
    const adminId = req.user.id;

    const admin = await User.findById(adminId).select('-password'); // Exclude password from response
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.json(admin);
  } catch (err) {
    console.error('Error fetching admin profile:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Update Admin Profile
exports.updateAdminProfile = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { username, email, currentPassword, newPassword } = req.body;

    // Find admin by ID
    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Check if password change is requested
    if (newPassword) {
      // Verify the current password
      const isMatch = await bcrypt.compare(currentPassword, admin.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      admin.password = await bcrypt.hash(newPassword, salt);
    }

    // Update username and email
    admin.username = username || admin.username;
    admin.email = email || admin.email;

    await admin.save();

    res.json({ message: 'Profile updated successfully', admin: { username: admin.username, email: admin.email } });
  } catch (err) {
    console.error('Error updating admin profile:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};