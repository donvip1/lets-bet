/*********************************************************
 Author:                Philip Awazie Donvip
 Year Created:          2026
 Description:           WebSocket service class for Lets Bet real-time notification events.
 Modified By:           Philip Awazie Donvip
 Modified Date:         2026-06-04
 Modification Notes:    Added reconnecting WebSocket client with listener registry and heartbeat support.
*********************************************************/

// ========================================================
// WebSocket URL helpers and singleton service
// ========================================================

import { API_BASE_URL } from './api';

const normalizeWebSocketUrl = (apiUrl) => {
  const baseUrl = new URL(apiUrl || API_BASE_URL);
  baseUrl.protocol = baseUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  baseUrl.pathname = '/notifications';
  return baseUrl;
};

class WebSocketService {
  constructor() {
    this.ws = null;
    this.userId = null;
    this.apiUrl = null;
    this.listeners = new Map();
    this.reconnectTimeout = null;
    this.heartbeatInterval = null;
    this.shouldReconnect = true;
  }

  connect(userId, apiUrl = API_BASE_URL) {
    if (!userId) {
      return;
    }

    // Reconnect intentionally closes any previous socket before opening a new one.
    this.disconnect({ clearListeners: false });
    this.userId = userId;
    this.apiUrl = apiUrl;
    this.shouldReconnect = true;

    const socketUrl = normalizeWebSocketUrl(apiUrl);
    socketUrl.search = new URLSearchParams({ userId: String(userId) }).toString();

    try {
      this.ws = new WebSocket(socketUrl.toString());
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      console.log('✅ WebSocket connected');
      this.emitLocal('STATUS', { type: 'STATUS', status: 'connected' });
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emitLocal('STATUS', { type: 'STATUS', status: 'error' });
    };

    this.ws.onclose = () => {
      console.log('❌ WebSocket disconnected');
      this.stopHeartbeat();
      this.emitLocal('STATUS', { type: 'STATUS', status: 'disconnected' });
      this.scheduleReconnect();
    };
  }

  handleMessage(data) {
    const callbacks = this.listeners.get(data.type) || [];
    callbacks.forEach((callback) => callback(data));

    const allCallbacks = this.listeners.get('*') || [];
    allCallbacks.forEach((callback) => callback(data));
  }

  emitLocal(eventType, data) {
    const callbacks = this.listeners.get(eventType) || [];
    callbacks.forEach((callback) => callback(data));
  }

  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }

    this.listeners.get(eventType).push(callback);
  }

  off(eventType, callback) {
    const callbacks = this.listeners.get(eventType);

    if (!callbacks) {
      return;
    }

    this.listeners.set(
      eventType,
      callbacks.filter((registeredCallback) => registeredCallback !== callback)
    );
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'PING' }));
      }
    }, 30000);
  }

  stopHeartbeat() {
    clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = null;
  }

  scheduleReconnect() {
    if (!this.shouldReconnect || !this.userId) {
      return;
    }

    clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      if (this.userId) {
        this.connect(this.userId, this.apiUrl || API_BASE_URL);
      }
    }, 5000);
  }

  disconnect(options = {}) {
    const { clearListeners = true } = options;
    this.shouldReconnect = false;
    clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = null;
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }

    if (clearListeners) {
      this.listeners.clear();
    }

    this.userId = null;
  }
}

const wsService = new WebSocketService();

export default wsService;
