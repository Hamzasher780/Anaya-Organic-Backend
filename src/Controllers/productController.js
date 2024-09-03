const Product = require('../Models/products');
const multer = require('multer');
const path = require('path');

// Set up multer storage
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Get all products
exports.getAllProducts = async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get a product by ID
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Create a new product
exports.createProduct = async (req, res) => {
    console.log('Creating product...');
    console.log('Request body:', req.body);
    console.log('File:', req.file);

    // Check if file was uploaded
    if (!req.file) {
        return res.status(400).json({ message: 'No image uploaded' });
    }

    const product = new Product({
        name: req.body.name,
        description: req.body.description,
        price: req.body.price,
        image: `/uploads/${req.file.filename}`, // Use the uploaded file's path
        stock: req.body.stock,
        category: req.body.category
    });

    try {
        const newProduct = await product.save();
        console.log('Product created successfully:', newProduct);
        res.status(201).json(newProduct);
    } catch (err) {
        console.error('Error saving product:', err.message);
        res.status(400).json({ message: err.message });
    }
};


// Update a product by ID
exports.updateProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (product) {
            product.name = req.body.name || product.name;
            product.description = req.body.description || product.description;
            product.price = req.body.price || product.price;
            product.image = req.file ? `/uploads/${req.file.filename}` : product.image; // Update image if a new file is uploaded
            product.stock = req.body.stock || product.stock;
            product.category = req.body.category || product.category;

            const updatedProduct = await product.save();
            res.json(updatedProduct);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// Delete a product by ID
exports.deleteProduct = async (req, res) => {
    try {
        console.log(`Attempting to delete product with ID: ${req.params.id}`);
        const product = await Product.findById(req.params.id);
        if (product) {
            await Product.deleteOne({ _id: req.params.id });
            console.log(`Product with ID: ${req.params.id} deleted successfully.`);
            res.json({ message: 'Product deleted' });
        } else {
            console.log(`Product with ID: ${req.params.id} not found.`);
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (err) {
        console.error(`Error deleting product with ID: ${req.params.id}`, err);
        res.status(500).json({ message: err.message });
    }
};


// Route to handle file uploads
exports.upload = upload.single('image');
