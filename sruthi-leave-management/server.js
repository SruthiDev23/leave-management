require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const db = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/leaves', leaveRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'Sruthi Leave Management System',
    timestamp: new Date().toISOString(),
    db: db.getStatus()
  });
});

// Fallback to index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error. Please check server logs.'
  });
});

// Start Express server
const server = app.listen(PORT, () => {
  console.log('\n=============================================================');
  console.log('   SRUTHI LEAVE MANAGEMENT SYSTEM - SERVER STARTED');
  console.log('=============================================================');
  console.log(` > Application URL:     http://localhost:${PORT}`);
  console.log(` > Employee Login:      http://localhost:${PORT}/employee-login.html`);
  console.log(` > Admin Login:         http://localhost:${PORT}/admin-login.html`);
  console.log(` > Employee Register:   http://localhost:${PORT}/register.html`);
  console.log(` > Database Target:     MySQL ("${process.env.DB_NAME || 'sruthi_leave_management'}")`);
  console.log('=============================================================\n');
});

module.exports = { app, server };
