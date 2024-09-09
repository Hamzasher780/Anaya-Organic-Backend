const Cart = require('../Models/cart');
const Product = require('../Models/products');

// Get the user's cart
exports.getCartByUserId = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.params.userId }).populate('items.product');
    
    if (!cart) {
      cart = new Cart({ user: req.params.userId, items: [] });
      await cart.save();
    }

    // Validate products in the cart
    cart.items = cart.items.filter(item => item.product && typeof item.product.price === 'number');
    
    res.json(cart);
  } catch (err) {
    console.error('Error fetching cart:', err.message);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// Add an item to the cart
exports.addToCart = async (req, res) => {
  const { userId, productId, quantity } = req.body;
  try {
    if (!userId || !productId || !quantity) {
      return res.status(400).json({ message: 'User ID, Product ID, and quantity are required.' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ message: 'Not enough stock available.' });
    }

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    const cartItem = cart.items.find(item => item.product.toString() === productId);
    if (cartItem) {
      cartItem.quantity += quantity;
    } else {
      cart.items.push({ product: productId, quantity });
    }

    await cart.save();
    res.json(cart);
  } catch (err) {
    console.error('Error adding to cart:', err.message);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// Update an item in the cart
exports.updateCartItem = async (req, res) => {
  const { userId, productId, quantity } = req.body;
  try {
    if (!userId || !productId || quantity < 1) {
      return res.status(400).json({ message: 'Invalid input. Ensure User ID, Product ID, and valid quantity.' });
    }

    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found.' });
    }

    const cartItem = cart.items.find(item => item.product._id.toString() === productId);
    if (!cartItem) {
      return res.status(404).json({ message: 'Product not found in cart.' });
    }

    cartItem.quantity = quantity;
    await cart.save();
    res.json(cart);
  } catch (err) {
    console.error('Error updating cart item:', err.message);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// Remove an item from the cart
exports.removeFromCart = async (req, res) => {
  const { userId, productId } = req.body;
  try {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: 'Cart not found.' });

    cart.items = cart.items.filter(item => item.product.toString() !== productId);
    await cart.save();

    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
