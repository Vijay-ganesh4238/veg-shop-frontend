import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import dns from 'dns';

// Force Google DNS to prevent connection lookup errors
dns.setServers(['8.8.8.8', '8.8.4.4']);

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] }
});

// ----------------------------------------------------
// MONGODB CLOUD CONNECTION
// ----------------------------------------------------
const MONGO_URI = "mongodb+srv://veguser:VegShop2026@cluster0.2mgq5zn.mongodb.net/vegshop?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ Connected securely to MongoDB Atlas Cloud!"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ----------------------------------------------------
// DATABASE SCHEMAS & MODELS
// ----------------------------------------------------
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

const orderSchema = new mongoose.Schema({
  username: { type: String, required: true },
  items: [
    {
      id: Number,
      name: String,
      price: Number,
      quantity: Number
    }
  ],
  totalAmount: { type: Number, required: true },
  paymentMode: { type: String, required: true },
  orderStatus: { type: String, default: "Order Placed" },
  createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', orderSchema);

// Vegetable Inventory Schema
const vegetableSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  unit: { type: String, required: true },
  image: { type: String, required: true },
  stockCount: { type: Number, default: 100 }
});
const Vegetable = mongoose.model('Vegetable', vegetableSchema);

const JWT_SECRET = "super_secret_freshvegg_key_2026";

// ----------------------------------------------------
// INVENTORY ROUTES
// ----------------------------------------------------
app.get('/api/vegetables', async (req, res) => {
  try {
    const veggies = await Vegetable.find();
    res.json(veggies);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching inventory' });
  }
});

app.get('/api/vegetables/seed', async (req, res) => {
  try {
    const initialData = [
      { id: 1, name: 'Fresh Tomato', price: 40, unit: 'kg', image: '🍅', stockCount: 50 },
      { id: 2, name: 'Organic Potato', price: 30, unit: 'kg', image: '🥔', stockCount: 50 },
      { id: 3, name: 'Green Spinach', price: 25, unit: 'bunch', image: '🥬', stockCount: 50 },
      { id: 4, name: 'Fresh Carrot', price: 50, unit: 'kg', image: '🥕', stockCount: 50 },
    ];
    
    await Vegetable.deleteMany({}); 
    await Vegetable.insertMany(initialData); 
    
    console.log("[Database] Inventory seeded successfully!");
    res.json({ message: "Database populated with fresh vegetables!" });
  } catch (error) {
    res.status(500).json({ message: 'Error seeding database' });
  }
});

// 👇 THE ADMIN CODE IS ADDED RIGHT HERE 👇
// Add a new vegetable product
app.post('/api/vegetables', async (req, res) => {
  try {
    const { name, price, unit, image, stockCount } = req.body;
    const newId = Date.now(); // Generates a unique numeric ID

    const newVeg = new Vegetable({
      id: newId,
      name,
      price: Number(price),
      unit,
      image: image || '🥦',
      stockCount: Number(stockCount) || 50
    });

    await newVeg.save();
    console.log(`[Database] Added new vegetable: ${name}`);
    res.status(201).json({ message: 'Vegetable added successfully!', product: newVeg });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add vegetable to database' });
  }
});

// Delete a vegetable product
app.delete('/api/vegetables/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Vegetable.findOneAndDelete({ id: Number(id) });
    console.log(`[Database] Deleted vegetable with ID: ${id}`);
    res.json({ message: 'Vegetable removed from catalog' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete vegetable' });
  }
});
// 👆 END OF ADMIN CODE 👆

// ----------------------------------------------------
// AUTHENTICATION ROUTES
// ----------------------------------------------------
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    console.log(`[Database] Registered new user: ${username}`);
    res.status(201).json({ message: 'User registered successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error during registration' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });
    console.log(`[Database] User logged in: ${username}`);
    res.json({ token, message: 'Login successful!' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error during login' });
  }
});

// ----------------------------------------------------
// ORDER ROUTES
// ----------------------------------------------------
app.post('/api/orders', async (req, res) => {
  try {
    const { username, items, totalAmount, paymentMode } = req.body;
    const newOrder = new Order({
      username: username || 'Guest User',
      items,
      totalAmount,
      paymentMode: paymentMode || 'UPI / Card'
    });

    await newOrder.save();
    console.log(`[Database] Saved new order for: ${newOrder.username} (₹${totalAmount})`);
    res.status(201).json({ message: 'Order saved successfully!', order: newOrder });
  } catch (error) {
    console.error("Order save error:", error);
    res.status(500).json({ message: 'Failed to record order in database' });
  }
});

app.get('/api/orders/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const userOrders = await Order.find({ username }).sort({ createdAt: -1 });
    res.json(userOrders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching order history' });
  }
});

// ----------------------------------------------------
// SOCKET.IO REAL-TIME GPS & STAGE DISPATCHER
// ----------------------------------------------------
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  socket.on('start_delivery_tracking', (orderData) => {
    console.log(`[Socket.IO] GPS tracking started for order: ${orderData.orderId}`);

    // Waypoints simulating delivery driver moving toward customer
    const routePoints = [
      { step: 0, statusName: "Order Placed", lat: 18.2949, lng: 83.8938 },
      { step: 1, statusName: "Packed & Ready (Hub)", lat: 18.2980, lng: 83.8965 },
      { step: 2, statusName: "Out for Delivery (On the road)", lat: 18.3030, lng: 83.9010 },
      { step: 3, statusName: "Delivered (Destination)", lat: 18.3070, lng: 83.9050 }
    ];

    let currentIndex = 0;

    const interval = setInterval(() => {
      currentIndex += 1;
      if (currentIndex < routePoints.length) {
        io.emit('driver_location_update', {
          orderId: orderData.orderId,
          step: routePoints[currentIndex].step,
          statusName: routePoints[currentIndex].statusName,
          lat: routePoints[currentIndex].lat,
          lng: routePoints[currentIndex].lng
        });
      } else {
        clearInterval(interval);
      }
    }, 4000); 
  });
  const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// ----------------------------------------------------
// SERVER START
// ----------------------------------------------------
const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});