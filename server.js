const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    exposedHeaders: ['Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const MONGODB_URI = 'mongodb+srv://sk1261_db_user:Pa55w0rd321@cluster0.zdufhbt.mongodb.net/inventory?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('✓ Connected to MongoDB successfully');
    ensureDefaultAdmin().catch(() => {});
})
.catch(err => {
    console.error('✗ MongoDB connection error:', err.message);
    console.error('Server will continue to run, but database operations will fail.');
    console.error('Please check your MongoDB connection string and credentials.');
});

// Connection event handlers
mongoose.connection.on('connected', () => {
    console.log('✓ MongoDB connected');
});

mongoose.connection.on('error', (err) => {
    console.error('✗ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('⚠ MongoDB disconnected');
});

// Helper function to check database connection
function isDbConnected() {
    const state = mongoose.connection.readyState;
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    return state === 1;
}

// Mongoose Schemas
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    role: { type: String, default: 'admin' }
}, { timestamps: true });
const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    sku: { type: String, required: true, unique: true },
    price: { type: Number, required: true },
    stock_quantity: { type: Number, default: 0 },
    min_stock_level: { type: Number, default: 0 },
    category: String
}, { timestamps: true });

const orderItemSchema = new mongoose.Schema({
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    unit_price: { type: Number, required: true },
    subtotal: { type: Number, required: true }
});

const orderSchema = new mongoose.Schema({
    order_number: { type: String, required: true, unique: true },
    customer_name: { type: String, required: true },
    customer_email: String,
    customer_phone: String,
    status: { type: String, default: 'pending' }, // pending, processing, shipped, delivered, cancelled
    total_amount: { type: Number, default: 0 },
    notes: String,
    items: [orderItemSchema]
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Order = mongoose.model('Order', orderSchema);

// Auth helpers
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function generateToken(user) {
    return jwt.sign({ uid: user._id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

function authRequired(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

// Seed default admin on first run
async function ensureDefaultAdmin() {
    if (!isDbConnected()) return;
    const count = await User.countDocuments();
    if (count === 0) {
        const username = 'admin';
        const password = 'admin123';
        const password_hash = await bcrypt.hash(password, 10);
        await User.create({ username, password_hash, role: 'admin' });
        console.log('✓ Seeded default admin user');
        console.log(`   username: ${username}`);
        console.log(`   password: ${password}`);
    }
}

// API Routes - Products
app.get('/api/products', async (req, res) => {
    try {
        if (!isDbConnected()) {
            return res.json([]); // Return empty array instead of error
        }
        const products = await Product.find().sort({ createdAt: -1 });
        const productsWithLowStock = products.map(product => {
            const productObj = product.toObject();
            return {
                ...productObj,
                low_stock: (productObj.stock_quantity || 0) <= (productObj.min_stock_level || 0)
            };
        });
        res.json(productsWithLowStock);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        const productObj = product.toObject();
        productObj.low_stock = product.stock_quantity <= product.min_stock_level;
        res.json(productObj);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/products', authRequired, async (req, res) => {
    try {
        if (!isDbConnected()) {
            return res.status(503).json({ error: 'Database not connected. Please check MongoDB connection.' });
        }
        
        const product = new Product(req.body);
        await product.save();
        const productObj = product.toObject();
        productObj.low_stock = (productObj.stock_quantity || 0) <= (productObj.min_stock_level || 0);
        res.status(201).json(productObj);
    } catch (error) {
        console.error('Error creating product:', error);
        if (error.code === 11000) {
            res.status(400).json({ error: 'SKU already exists' });
        } else if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(e => e.message).join(', ');
            res.status(400).json({ error: `Validation error: ${errors}` });
        } else {
            res.status(500).json({ error: error.message || 'Failed to create product' });
        }
    }
});

app.put('/api/products/:id', authRequired, async (req, res) => {
    try {
        if (!isDbConnected()) {
            return res.status(503).json({ error: 'Database not connected. Please check MongoDB connection.' });
        }
        
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        const productObj = product.toObject();
        productObj.low_stock = (productObj.stock_quantity || 0) <= (productObj.min_stock_level || 0);
        res.json(productObj);
    } catch (error) {
        console.error('Error updating product:', error);
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(e => e.message).join(', ');
            res.status(400).json({ error: `Validation error: ${errors}` });
        } else {
            res.status(500).json({ error: error.message || 'Failed to update product' });
        }
    }
});

app.delete('/api/products/:id', authRequired, async (req, res) => {
    try {
        if (!isDbConnected()) {
            return res.status(503).json({ error: 'Database not connected. Please check MongoDB connection.' });
        }
        
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: error.message || 'Failed to delete product' });
    }
});

// API Routes - Orders
app.get('/api/orders', async (req, res) => {
    try {
        if (!isDbConnected()) {
            return res.json([]); // Return empty array instead of error
        }
        const orders = await Order.find().sort({ createdAt: -1 }).populate('items.product_id');
        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/orders/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate('items.product_id');
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/orders', authRequired, async (req, res) => {
    try {
        const { customer_name, customer_email, customer_phone, items, notes } = req.body;
        
        // Generate order number
        const orderCount = await Order.countDocuments();
        const orderNumber = `ORD-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${String(orderCount + 1).padStart(4, '0')}`;
        
        let totalAmount = 0;
        const orderItems = [];
        
        // Validate items and calculate totals
        for (const itemData of items) {
            const product = await Product.findById(itemData.product_id);
            if (!product) {
                return res.status(400).json({ error: `Product ${itemData.product_id} not found` });
            }
            
            const quantity = parseInt(itemData.quantity);
            if (product.stock_quantity < quantity) {
                return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
            }
            
            const unitPrice = product.price;
            const subtotal = unitPrice * quantity;
            totalAmount += subtotal;
            
            orderItems.push({
                product_id: product._id,
                quantity: quantity,
                unit_price: unitPrice,
                subtotal: subtotal
            });
            
            // Update stock
            product.stock_quantity -= quantity;
            await product.save();
        }
        
        const order = new Order({
            order_number: orderNumber,
            customer_name,
            customer_email,
            customer_phone,
            status: 'pending',
            total_amount: totalAmount,
            notes,
            items: orderItems
        });
        
        await order.save();
        await order.populate('items.product_id');
        res.status(201).json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/orders/:id', authRequired, async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('items.product_id');
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/orders/:id/status', authRequired, async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        ).populate('items.product_id');
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/orders/:id', authRequired, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        // Restore stock if order is cancelled
        if (order.status !== 'cancelled') {
            for (const item of order.items) {
                const product = await Product.findById(item.product_id);
                if (product) {
                    product.stock_quantity += item.quantity;
                    await product.save();
                }
            }
        }
        
        await Order.findByIdAndDelete(req.params.id);
        res.json({ message: 'Order deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        if (!isDbConnected()) return res.status(503).json({ error: 'Database not connected' });
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'username and password are required' });
        const exist = await User.findOne({ username });
        if (exist) return res.status(400).json({ error: 'Username already exists' });
        const password_hash = await bcrypt.hash(password, 10);
        const user = await User.create({ username, password_hash });
        const token = generateToken(user);
        res.json({ token, username: user.username });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        if (!isDbConnected()) return res.status(503).json({ error: 'Database not connected' });
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
        const token = generateToken(user);
        res.json({ token, username: user.username });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/auth/me', authRequired, async (req, res) => {
    res.json({ username: req.user.username, role: req.user.role });
});

// Connection Status Check
app.get('/api/connection/status', (req, res) => {
    const state = mongoose.connection.readyState;
    const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
    };
    res.json({
        connected: state === 1,
        state: states[state] || 'unknown',
        readyState: state,
        message: state === 1 ? 'MongoDB is connected' : `MongoDB is ${states[state] || 'unknown'}`
    });
});

// Dashboard Stats
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        if (!isDbConnected()) {
            return res.json({
                total_products: 0,
                low_stock_products: 0,
                total_orders: 0,
                pending_orders: 0,
                total_inventory_value: 0
            });
        }
        const totalProducts = await Product.countDocuments();
        const products = await Product.find();
        const lowStockProducts = products.filter(p => (p.stock_quantity || 0) <= (p.min_stock_level || 0)).length;
        const totalOrders = await Order.countDocuments();
        const pendingOrders = await Order.countDocuments({ status: 'pending' });
        const totalInventoryValue = products.reduce((sum, p) => {
            const price = p.price || 0;
            const stock = p.stock_quantity || 0;
            return sum + (price * stock);
        }, 0);
        
        res.json({
            total_products: totalProducts || 0,
            low_stock_products: lowStockProducts || 0,
            total_orders: totalOrders || 0,
            pending_orders: pendingOrders || 0,
            total_inventory_value: Math.round(totalInventoryValue * 100) / 100
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: error.message });
    }
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

