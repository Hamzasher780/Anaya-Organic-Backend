const mongoose = require("mongoose");
const Order = require("../Models/order");
const Cart = require("../Models/cart");
const User = require("../Models/user"); // Assuming you have a User model
const Product = require("../Models/products"); // Ensure correct capitalization
const nodemailer = require("nodemailer");

// Mock payment processing function (only for non-COD payments)
async function processPayment(totalAmount, paymentDetails) {
  return new Promise((resolve, reject) => {
    if (totalAmount > 0) {
      resolve(true);
    } else {
      reject("Payment failed");
    }
  });
}

// Email notification function
async function sendOrderConfirmationEmail(userEmail, order) {
  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  let mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: userEmail,
    subject: "Order Confirmation",
    text: `Your order ${order._id} has been placed successfully.\n\nOrder Details:\n- Total Amount: PKR ${order.totalAmount}\n- Shipping Address: ${order.shippingAddress}\n\nThank you for shopping with us!`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending order confirmation email:", error);
    } else {
      console.log("Order confirmation email sent:", info.response);
    }
  });
}

// Get all orders for a user
exports.getOrdersByUserId = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.params.userId })
      .populate("user", "username email")
      .populate("items.product");
    res.json(orders);
  } catch (err) {
    console.error("Error fetching orders by user ID:", err);
    res.status(500).json({ message: err.message });
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
      res.status(404).json({ message: "Order not found" });
    }
  } catch (err) {
    console.error("Error fetching order by ID:", err);
    res.status(500).json({ message: err.message });
  }
};

// Create an order from a cart with Cash on Delivery (COD) support
exports.createOrder = async (req, res) => {
  console.log("Received request to create order:", req.body); // Log the incoming request data

  const { userId, shippingAddress, paymentMethod, totalAmount } = req.body;

  try {
    const cart = await Cart.findOne({ user: userId }).populate("items.product");
    if (!cart) {
      console.error("Cart not found for user:", userId);
      return res.status(404).json({ message: "Cart not found" });
    }

    const validItems = cart.items.filter((item) => item.product !== null);

    if (validItems.length === 0) {
      console.error("No valid products in cart for user:", userId);
      return res.status(400).json({ message: "No valid products in cart" });
    }

    const order = new Order({
      user: userId,
      items: validItems.map((item) => ({
        product: item.product._id,
        quantity: item.quantity,
        price: item.product.price,
      })),
      shippingAddress,
      paymentMethod,
      totalAmount,
      status: paymentMethod === "COD" ? "Pending" : "Paid",
    });

    await order.save();
    console.log("Order saved successfully:", order);

    // Decrease stock quantity for each product in the order
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        console.log(
          `Updating stock for product: ${product.name}, current stock: ${product.stock}, order quantity: ${item.quantity}`
        );
        product.stock -= item.quantity; // Decrease the stock
        await product.save();
        console.log(
          `New stock for product: ${product.name} is ${product.stock}`
        );
      } else {
        console.warn(`Product not found for item: ${item.product}`);
      }
    }

    // Optionally, delete the cart after order creation
    await Cart.findOneAndDelete({ user: userId });

    res.status(201).json(order);
  } catch (err) {
    console.error("Error creating order:", err);
    res.status(500).json({ message: err.message });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.status = req.body.status || order.status;
    await order.save();
    res.json(order);
  } catch (err) {
    console.error("Error updating order status:", err);
    res.status(500).json({ message: err.message });
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
    console.error("Error fetching all orders:", err);
    res.status(500).json({ message: err.message });
  }
};

// Delete an order by ID
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json({ message: "Order deleted successfully" });
  } catch (err) {
    console.error("Error deleting order:", err);
    res.status(500).json({ message: err.message });
  }
};

// Update order details (status, shipping address)
exports.updateOrderDetails = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
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
    console.error("Error updating order details:", err);
    res.status(500).json({ message: err.message });
  }
};
