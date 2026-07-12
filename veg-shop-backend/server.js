import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] }
});

// Local In-Memory Database Array (Bypasses MongoDB completely)
const usersDatabase = [];

console.log("Connected securely to Local Mock Database Engine");

const JWT_SECRET = "super_secret_freshvegg_key_2026";

// Registration Route
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Check if user exists
    const existingUser = usersDatabase.find(user => user.username === username);
    if (existingUser) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    // Hash password and store locally
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: Date.now().toString(),
      username,
      password: hashedPassword
    };
    
    usersDatabase.push(newUser);
    console.log(`[Database] Registered new user: ${username}`);
    res.status(201).json({ message: 'User registered successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error during registration' });
  }
});

// Login Route
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Find user
    const user = usersDatabase.find(user => user.username === username);
    if (!user) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });
    console.log(`[Database] User logged in: ${username}`);
    res.json({ token, message: 'Login successful!' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error during login' });
  }
});

io.on('connection', (socket) => {
  socket.on('send_location', (data) => {
    io.emit('receive_location', data);
  });
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});