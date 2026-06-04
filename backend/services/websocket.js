'use strict';

/*********************************************************
 Author:                Philip Awazie Donvip
 Year Created:          2026
 Description:           WebSocket notification service for real-time user alerts.
 Modified By:           Philip Awazie Donvip
 Modified Date:         2026-06-04
 Modification Notes:    Added WebSocket client registry, keep-alive handling, and notification broadcasting helpers.
*********************************************************/

// ========================================================
// Imports, dependencies, and module setup
// ========================================================

const WebSocket = require("ws");
const http = require("http");
const jwt = require("jsonwebtoken");

const server = http.createServer();
let wss = new WebSocket.Server({ server });

// userId -> { ws, sockets: Set<WebSocket> }
const clients = new Map();

const NOTIFICATION_TYPES = Object.freeze({
  BET_JOINED: "BET_JOINED",
  BET_SETTLED: "BET_SETTLED",
  DEPOSIT_COMPLETED: "DEPOSIT_COMPLETED",
  WITHDRAWAL_COMPLETED: "WITHDRAWAL_COMPLETED",
  SYSTEM: "SYSTEM",
});

const getQueryParam = (req, key) => {
  try {
    const url = new URL(req.url, "http://localhost");
    return url.searchParams.get(key);
  } catch (error) {
    return null;
  }
};

const getUserIdFromRequest = (req) => {
  const token = getQueryParam(req, "token");

  if (token && process.env.JWT_SECRET) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return decoded.id;
    } catch (error) {
      console.error("WebSocket auth error:", error.message);
      return null;
    }
  }

  return getQueryParam(req, "userId");
};

const getClient = (userId) => {
  if (!clients.has(userId)) {
    clients.set(userId, { ws: null, sockets: new Set() });
  }

  return clients.get(userId);
};

const removeClientSocket = (userId, ws) => {
  const client = clients.get(userId);

  if (!client) {
    return;
  }

  client.sockets.delete(ws);

  if (client.ws === ws) {
    client.ws = client.sockets.values().next().value || null;
  }

  if (client.sockets.size === 0) {
    clients.delete(userId);
  }
};

const sendJson = (ws, payload) => {
  if (ws.readyState !== WebSocket.OPEN) {
    return;
  }

  try {
    ws.send(JSON.stringify(payload));
  } catch (error) {
    console.error("WebSocket send error:", error.message);
  }
};

const buildNotification = (notification) => ({
  type: notification.type || NOTIFICATION_TYPES.SYSTEM,
  title: notification.title || "Lets Bet",
  message: notification.message || "",
  data: notification.data || {},
  timestamp: notification.timestamp || new Date().toISOString(),
});

// ========================================================
// Connection handling and notification delivery
// ========================================================

const handleConnection = (ws, req) => {
  const userId = getUserIdFromRequest(req);

  if (!userId) {
    ws.close(1008, "Missing userId");
    return;
  }

  const client = getClient(userId);
  client.ws = ws;
  client.sockets.add(ws);

  sendJson(ws, {
    type: "CONNECTED",
    message: "Connected to notifications",
    timestamp: new Date().toISOString(),
  });

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === "PING") {
        sendJson(ws, { type: "PONG", timestamp: new Date().toISOString() });
      }
    } catch (error) {
      console.error("WebSocket message error:", error.message);
    }
  });

  ws.on("error", (error) => {
    console.error("WebSocket client error:", error.message);
  });

  ws.on("close", () => {
    removeClientSocket(userId, ws);
  });
};

wss.on("connection", handleConnection);

const attachWebSocketServer = (httpServer) => {
  wss.close();
  wss = new WebSocket.Server({
    server: httpServer,
    path: "/notifications",
  });
  wss.on("connection", handleConnection);
  return wss;
};

const notify = (userId, notification) => {
  const client = clients.get(String(userId));

  if (!client || client.sockets.size === 0) {
    return false;
  }

  const payload = buildNotification(notification);

  client.sockets.forEach((ws) => {
    sendJson(ws, payload);
  });

  return true;
};

module.exports = {
  get wss() {
    return wss;
  },
  server,
  notify,
  attachWebSocketServer,
  NOTIFICATION_TYPES,
};
