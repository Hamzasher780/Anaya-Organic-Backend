require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require("path");

// Import routes
const productRoutes = require("./src/Routes/productRoutes");
const cartRoutes = require("./src/Routes/cartRoute");
const orderRoutes = require("./src/Routes/orderRoutes");
const authRoutes = require("./src/Routes/userRoute");
const adminRoutes = require("./src/Routes/adminRoute");

const app = express();

app.use(
  cors({
    origin: ['https://anayaorganic.netlify.app'], // Adjust this to your frontend origin
    credentials: true, // Allows session cookies from the browser to pass through
    methods: ["GET", "POST", "PUT", "DELETE"], // Ensure these methods are allowed
  })
);

app.use(express.json());
app.use(cookieParser());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/auth", authRoutes);
app.use("/admin", adminRoutes);

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Connected..."))
  .catch((err) => console.error("MongoDB connection error:", err));

app.get("/cart.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "cart.html"));
});

app.get("/", (req, res) => {
  res.send("Server is running!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`)); // Fixed the backtick here
