'use strict';
const http = require('http');
const app = require('./app');
const { PORT } = require('./config/env');
const { initWsServer } = require('./ws/wsServer');

const server = http.createServer(app);

// Attach WebSocket server to the same HTTP server
initWsServer(server);

server.listen(PORT, () => {
  console.log(`[ColorPath] Server running on http://localhost:${PORT}`);
  console.log(`[ColorPath] API: http://localhost:${PORT}/api`);
  console.log(`[ColorPath] WebSocket: ws://localhost:${PORT}/ws`);
});

server.on('error', (err) => {
  console.error('[Server] Fatal error:', err);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('[Server] Closed');
    process.exit(0);
  });
});
