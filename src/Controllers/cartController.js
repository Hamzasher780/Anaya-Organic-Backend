const Cart = require('../Models/cart');
const Product = require('../Models/products');

// Get the user's cart
exports.getCartByUserId = async (req, res) => {
    console.log(`Received request to fetch cart for user: ${req.params.userId}`);
    try {
        let cart = await Cart.findOne({ user: req.params.userId }).populate('items.product');
        
        if (!cart) {
            cart = new Cart({ user: req.params.userId, items: [] });
            await cart.save();
            console.log('New cart created:', cart);
        }

        // Validate that each product has a valid price
        cart.items = cart.items.filter(item => {
            if (item.product && typeof item.product.price === 'number' && !isNaN(item.product.price)) {
                return true; // Keep valid items
            } else {
                console.error('Invalid product price detected, removing item from cart:', item);
                return false; // Remove invalid items
            }
        });

        res.json(cart);
    } catch (err) {
        console.error('Error fetching cart:', err.message);
        res.status(500).json({ message: err.message });
    }
};


exports.addToCart = async (req, res) => {
    const { userId, productId, quantity } = req.body;
    console.log('Adding to cart:', req.body);
    try {
        if (!userId) {
            console.error('User ID is required');
            return res.status(400).json({ message: 'User ID is required' });
        }
        const product = await Product.findById(productId);
        if (!product) {
            console.error('Product not found:', productId);
            return res.status(404).json({ message: 'Product not found' });
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
        console.log('Item added to cart successfully:', cart);
        res.json(cart);
    } catch (err) {
        console.error('Error adding to cart:', err.message);
        res.status(500).json({ message: err.message });
    }
};

// Update an item in the cart
exports.updateCartItem = async (req, res) => {
    const { userId, productId, quantity } = req.body;
    console.log('Updating cart item:', req.body);
    try {
        const cart = await Cart.findOne({ user: userId }).populate('items.product'); // Ensure product details are populated
        if (!cart) {
            console.error('Cart not found for user:', userId);
            return res.status(404).json({ message: 'Cart not found' });
        }

        const cartItem = cart.items.find(item => item.product._id.toString() === productId);
        if (!cartItem) {
            console.error('Product not found in cart:', productId);
            return res.status(404).json({ message: 'Product not found in cart' });
        }

        if (quantity < 1) {
            console.error('Invalid quantity:', quantity);
            return res.status(400).json({ message: 'Quantity must be at least 1' });
        }

        cartItem.quantity = quantity;
        await cart.save();
        const updatedCart = await Cart.findOne({ user: userId }).populate('items.product'); // Populate again after saving
        console.log('Cart item updated successfully:', updatedCart);
        res.json(updatedCart); // Send fully populated cart data
    } catch (err) {
        console.error('Error updating cart item:', err.message);
        res.status(500).json({ message: err.message });
    }
};

// Remove an item from the cart
exports.removeFromCart = async (req, res) => {
    const { userId, productId } = req.body;
    console.log('Removing item from cart:', req.body);
    try {
        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            console.error('Cart not found for user:', userId);
            return res.status(404).json({ message: 'Cart not found' });
        }

        cart.items = cart.items.filter(item => item.product.toString() !== productId);
        await cart.save();
        console.log('Item removed from cart successfully:', cart);
        res.json(cart);
    } catch (err) {
        console.error('Error removing item from cart:', err.message);
        res.status(500).json({ message: err.message });
    }
};
