/*********************************************************
 Author:                Philip Awazie Donvip
 Year Created:          2026
 Description:           Browser WebSocket client for Lets Bet real-time notifications.
 Modified By:           Philip Awazie Donvip
 Modified Date:         2026-06-04
 Modification Notes:    Added authenticated notification socket connection helpers.
*********************************************************/

// ========================================================
// WebSocket URL helpers and connection setup
// ========================================================

import { API_BASE_URL } from './api';

const buildWebSocketUrl = (token) => {
  const apiUrl = new URL(API_BASE_URL);
  apiUrl.protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  apiUrl.pathname = '/notifications';
  apiUrl.search = new URLSearchParams({ token }).toString();
  return apiUrl.toString();
};

export const createNotificationSocket = ({ token, onMessage, onStatus }) => {
  if (!token) {
    return null;
  }

  const socket = new WebSocket(buildWebSocketUrl(token));

  socket.addEventListener('open', () => {
    onStatus?.('connected');
  });

  socket.addEventListener('message', (event) => {
    try {
      const notification = JSON.parse(event.data);
      onMessage?.(notification);
    } catch (error) {
      console.error('Notification parse error:', error);
    }
  });

  socket.addEventListener('close', () => {
    onStatus?.('disconnected');
  });

  socket.addEventListener('error', (error) => {
    onStatus?.('error');
    console.error('Notification socket error:', error);
  });

  return socket;
};
