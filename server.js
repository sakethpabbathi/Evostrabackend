
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require("multer");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));
require("dotenv").config();

// --- Database Connection ---
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

db.connect(err => {
    if (err) throw err;
    console.log('MySQL connected...');
});

// --- Login Route (Existing) ---
app.post("/api/login", (req, res) => {
    const { email, password } = req.body;

    const query = "SELECT * FROM users WHERE email = ? AND password = ?";
    db.query(query, [email, password], (err, result) => {
        if (err) return res.status(500).json({ error: "Server error" });

        if (result.length === 0) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const user = result[0];
        return res.json({
            message: "Login successful",
            role: user.role
        });
    });
});


// GET all users
app.get("/api/users", (req, res) => {
    const query = "SELECT id, email, role FROM users";
    db.query(query, (err, result) => {
        if (err) return res.status(500).json({ error: "Server error" });
        res.json(result);
    });
});
// UPDATE user
app.put("/api/users/:id", (req, res) => {
    const { email, role } = req.body;
    const userId = req.params.id;

    const query = "UPDATE users SET email=?, role=? WHERE id=?";
    db.query(query, [email, role, userId], (err, result) => {
        if (err) return res.status(500).json({ error: "Server error" });
        res.json({ message: "User updated successfully" });
    });
});
// DELETE user
app.delete("/api/users/:id", (req, res) => {
    const userId = req.params.id;
    const query = "DELETE FROM users WHERE id=?";
    db.query(query, [userId], (err, result) => {
        if (err) return res.status(500).json({ error: "Server error" });
        res.json({ message: "User deleted successfully" });
    });
});



// --- Multer Setup (Existing) ---
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });


// 1. READ: Fetch all products (Existing)
app.get("/api/products", (req, res) => {
    db.query("SELECT * FROM products", (err, result) => {
        if (err) return res.status(500).send(err);
        res.send(result);
    });
});

// 2. CREATE: Add product (Existing)
app.post("/api/products", upload.single("image"), (req, res) => {
    // Note: The product 'id' should ideally be auto-incremented in the DB
    const { id, name, stock, price } = req.body; 
    const image = req.file ? `http://localhost:5000/uploads/${req.file.filename}` : "";

    const query = "INSERT INTO products (id, name, stock, price, image) VALUES (?, ?, ?, ?, ?)";
    db.query(query, [id, name, stock, price, image], (err) => {
        if (err) return res.status(500).send(err);
        res.send({ message: "Product Added Successfully" });
    });
});

// --- NEW CRUD OPERATIONS ---

// 3. UPDATE: Edit product by ID
app.put("/api/products/:id", upload.single("image"), (req, res) => {
    const productId = req.params.id;
    const { name, stock, price } = req.body;
    
    let query;
    let queryParams;

    if (req.file) {
        // Update product with a NEW image
        const image = `http://localhost:5000/uploads/${req.file.filename}`;
        query = "UPDATE products SET name = ?, stock = ?, price = ?, image = ? WHERE id = ?";
        queryParams = [name, stock, price, image, productId];
    } else {
        // Update product WITHOUT changing the image
        query = "UPDATE products SET name = ?, stock = ?, price = ? WHERE id = ?";
        queryParams = [name, stock, price, productId];
    }

    db.query(query, queryParams, (err, result) => {
        if (err) return res.status(500).send(err);
        
        if (result.affectedRows === 0) {
            return res.status(404).send({ message: "Product not found" });
        }
        
        res.send({ message: "Product Updated Successfully" });
    });
});


 
app.delete("/api/products/:id", (req, res) => {
    const productId = req.params.id;

    const query = "DELETE FROM products WHERE id = ?";
    db.query(query, [productId], (err, result) => {
        if (err) {
            console.error("Database error during deletion:", err);
            return res.status(500).send({ message: "Server error during deletion." });
        }
        
        // Check if any row was affected
        if (result.affectedRows === 0) {
            return res.status(404).send({ message: "Product not found" });
        }
        
        res.send({ message: "Product Deleted Successfully" });
    });
});


// --- Server Listen (Existing) ---
const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));