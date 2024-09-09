const multer = require('multer');
const Order = require('../Models/order');
const Cart = require('../Models/cart');
const Product = require('../Models/products');
const User = require('../Models/user');
const nodemailer = require('nodemailer');

// Multer configuration for handling proof of payment uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/proofs/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

exports.upload = multer({ storage }).single('proofOfPayment');

// Middleware for parsing other form data
const bodyParser = require('body-parser');

// Create an order
exports.createOrder = async (req, res) => {
  try {
    const { userId, paymentMethod, totalAmount, shippingAddress, buyNowProductId } = req.body;
    
    // Check if shippingAddress exists
    if (!shippingAddress) {
      return res.status(400).json({ message: 'Shipping address is required.' });
    }

    let items = [];

    // Handle "Buy Now" scenario
    if (buyNowProductId) {
      const product = await Product.findById(buyNowProductId);
      if (!product) {
        return res.status(400).json({ message: 'Product not found.' });
      }
      if (product.stock <= 0) {
        return res.status(400).json({ message: `Not enough stock for product: ${product.name}` });
      }
      items.push({
        product: product._id,
        quantity: 1,
        price: product.price,
      });
    } else {
      // Handle regular cart checkout
      const cart = await Cart.findOne({ user: userId }).populate('items.product');
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ message: 'Cart is empty or not found.' });
      }

      // Stock validation for cart items
      for (const item of cart.items) {
        if (item.product.stock < item.quantity) {
          return res.status(400).json({ message: `Not enough stock for product: ${item.product.name}` });
        }
      }
      items = cart.items.map(item => ({
        product: item.product._id,
        quantity: item.quantity,
        price: item.product.price,
      }));
    }

    // Save the order
    const order = new Order({
      user: userId,
      items: items,
      shippingAddress: shippingAddress, // Parsed as JSON object
      paymentMethod,
      totalAmount,
      status: paymentMethod === 'COD' ? 'Pending' : 'Paid',
    });

    await order.save();

    // Decrement stock for products
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      product.stock -= item.quantity;
      await product.save();
    }

    // Clear the cart if it's a cart checkout
    if (!buyNowProductId) {
      await Cart.findOneAndUpdate({ user: userId }, { items: [] });
    }

    res.status(201).json(order);
  } catch (err) {
    console.error('Error creating order:', err.message);
    res.status(500).json({ message: 'Internal server error.' });
  }
};



// Mock payment processing function for non-COD orders
async function processPayment(totalAmount) {
  if (totalAmount <= 0) {
    throw new Error('Invalid payment amount.');
  }
  return true;
}

// Send email confirmation
async function sendOrderConfirmationEmail(userEmail, order) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: userEmail,
    subject: 'Order Confirmation',
    text: `Your order has been placed successfully. Order ID: ${order._id}`
  };

  await transporter.sendMail(mailOptions);
}


// Get all orders for a user
exports.getOrdersByUserId = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.params.userId })
      .populate("user", "username email")
      .populate("items.product");
    res.json(orders);
  } catch (err) {
    console.error("Error fetching orders by user ID:", err.message);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Get an order by ID
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("items.product")
      .populate("user");
    if (order) {
      res.json(order);
    } else {
      res.status(404).json({ message: "Order not found." });
    }
  } catch (err) {
    console.error("Error fetching order by ID:", err.message);
    res.status(500).json({ message: "Internal server error." });
  }
};

// // Create an order with payment and stock validation
// exports.createOrder = async (req, res) => {
//   const { userId, shippingAddress, paymentMethod, totalAmount, paymentDetails } = req.body;

//   try {
//     const cart = await Cart.findOne({ user: userId }).populate("items.product");
//     if (!cart || cart.items.length === 0) {
//       return res.status(400).json({ message: "Cart is empty or not found." });
//     }

//     // Stock validation
//     for (const item of cart.items) {
//       if (!item.product || item.product.stock < item.quantity) {
//         return res.status(400).json({
//           message: `Not enough stock for product: ${item.product ? item.product.name : "unknown"}`,
//         });
//       }
//     }

//     // Process payment for non-COD orders
//     if (paymentMethod !== "COD") {
//       try {
//         await processPayment(totalAmount, paymentDetails);
//       } catch (err) {
//         return res.status(500).json({ message: "Payment failed." });
//       }
//     }

//     // Create the order
//     const order = new Order({
//       user: userId,
//       items: cart.items.map(item => ({
//         product: item.product._id,
//         quantity: item.quantity,
//         price: item.product.price,
//       })),
//       shippingAddress,
//       paymentMethod,
//       totalAmount,
//       status: paymentMethod === "COD" ? "Pending" : "Paid",
//     });

//     await order.save();

//     // Decrement stock for products
//     for (const item of order.items) {
//       const product = await Product.findById(item.product);
//       product.stock -= item.quantity;
//       await product.save();
//     }

//     // Clear the cart after order creation
//     await Cart.findOneAndUpdate({ user: userId }, { items: [] });

//     // Send order confirmation email
//     const user = await User.findById(userId);
//     await sendOrderConfirmationEmail(user.email, order);

//     res.status(201).json(order);
//   } catch (err) {
//     console.error("Error creating order:", err.message);
//     res.status(500).json({ message: "Internal server error." });
//   }
// };

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    order.status = req.body.status || order.status;
    await order.save();
    res.json(order);
  } catch (err) {
    console.error("Error updating order status:", err.message);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Get all orders
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "username email")
      .populate("items.product");
    res.json(orders);
  } catch (err) {
    console.error("Error fetching all orders:", err.message);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Delete an order
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }
    res.json({ message: "Order deleted successfully." });
  } catch (err) {
    console.error("Error deleting order:", err.message);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Update order details (status, shipping address)
exports.updateOrderDetails = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    if (req.body.status) {
      order.status = req.body.status;
    }

    if (req.body.shippingAddress) {
      order.shippingAddress = {
        ...order.shippingAddress,
        ...req.body.shippingAddress,
      };
    }

    await order.save();
    res.json(order);
  } catch (err) {
    console.error("Error updating order details:", err.message);
    res.status(500).json({ message: "Internal server error." });
  }
};
