'use strict';
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { ALLOWED_ORIGINS } = require('./config/env');
const { errorHandler } = require('./middleware/errorHandler');

// Route imports
const authRoutes      = require('./routes/auth');
const problemRoutes   = require('./routes/problems');
const sessionRoutes   = require('./routes/sessions');
const eventRoutes     = require('./routes/events');
const hintRoutes      = require('./routes/hints');
const dashboardRoutes = require('./routes/dashboard');
const exportRoutes    = require('./routes/export');
const masteryRoutes   = require('./routes/mastery');
const explainRoutes   = require('./routes/explain');

const app = express();

// Security
app.use(helmet({
  contentSecurityPolicy: false, // Relaxed for dev; tighten in production
}));
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// Serve frontend static files
// FRONTEND_PATH env var used in Docker (mounted as /app/public)
// Falls back to ../../frontend for local development
const frontendPath = process.env.FRONTEND_PATH || path.join(__dirname, '../../frontend');
app.use(express.static(frontendPath));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

// API routes
app.use('/api/auth',      authRoutes);
app.use('/api/problems',  problemRoutes);
app.use('/api/sessions',  sessionRoutes);
app.use('/api/events',    eventRoutes);
app.use('/api/hints',     hintRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/export',    exportRoutes);
app.use('/api/mastery',   masteryRoutes);
app.use('/api/explain',   explainRoutes);

// SPA fallback for dashboard route
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(frontendPath, 'dashboard.html'));
});

// 404 handler for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'not_found' });
});

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;
