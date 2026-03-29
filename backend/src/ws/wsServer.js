'use strict';
const { WebSocketServer, WebSocket } = require('ws');
const { authenticateWs } = require('./wsAuth');

// Maps: userId -> WebSocket (for teachers watching the class)
const teacherClients = new Map();
// Maps: sessionId -> { userId, username, problemId, currentStep, totalSteps, routeErrors, mcErrors, lastEventAt, stuckAlert }
const activeSessions = new Map();

let wss = null;

function initWsServer(httpServer) {
  wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, request) => {
    let user;
    try {
      user = authenticateWs(request);
    } catch (err) {
      ws.close(4001, err.message);
      return;
    }

    ws._user = user;
    console.log(`[WS] Connected: ${user.username} (${user.role})`);

    if (user.role === 'teacher' || user.role === 'admin') {
      teacherClients.set(user.id, ws);
      // Send current snapshot immediately
      const snapshot = Array.from(activeSessions.values());
      safeSend(ws, { type: 'class_snapshot', data: snapshot });
    }

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        handleMessage(ws, user, msg);
      } catch (_) {}
    });

    ws.on('close', () => {
      if (user.role === 'teacher' || user.role === 'admin') {
        teacherClients.delete(user.id);
      }
      console.log(`[WS] Disconnected: ${user.username}`);
    });

    ws.on('error', (err) => {
      console.error(`[WS] Error for ${user.username}:`, err.message);
    });

    // Heartbeat
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
  });

  // Ping all clients every 30s to detect stale connections
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) { ws.terminate(); return; }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  // Check for stuck students every 30s
  const stuckCheck = setInterval(() => {
    const now = Date.now();
    for (const [sessionId, data] of activeSessions.entries()) {
      const idle = now - data.lastEventAt;
      const wasStuck = data.stuckAlert;
      data.stuckAlert = idle > 90000; // 90 seconds
      if (data.stuckAlert && !wasStuck) {
        broadcastToTeachers({ type: 'student_stuck', data: { sessionId, ...data } });
      }
    }
  }, 30000);

  wss.on('close', () => {
    clearInterval(heartbeat);
    clearInterval(stuckCheck);
  });

  console.log('[WS] WebSocket server initialized on /ws');
  return wss;
}

function handleMessage(ws, user, msg) {
  if (msg.type === 'student_heartbeat' && msg.sessionId) {
    const session = activeSessions.get(msg.sessionId);
    if (session && session.userId === user.id) {
      session.lastEventAt = Date.now();
      session.stuckAlert = false;
    }
  }
}

/**
 * Called from the events route after processing a batch of events.
 * Updates activeSessions and broadcasts to teachers.
 */
function onStudentEvent(sessionId, sessionData) {
  activeSessions.set(sessionId, {
    ...sessionData,
    lastEventAt: Date.now(),
    stuckAlert: false,
  });
  broadcastToTeachers({ type: 'session_update', data: { sessionId, ...sessionData } });
}

/**
 * Called when a session is completed.
 */
function onSessionComplete(sessionId) {
  activeSessions.delete(sessionId);
  broadcastToTeachers({ type: 'session_complete', data: { sessionId } });
}

function broadcastToTeachers(message) {
  for (const ws of teacherClients.values()) {
    safeSend(ws, message);
  }
}

function safeSend(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(data));
    } catch (err) {
      console.error('[WS] Send error:', err.message);
    }
  }
}

module.exports = { initWsServer, onStudentEvent, onSessionComplete };
