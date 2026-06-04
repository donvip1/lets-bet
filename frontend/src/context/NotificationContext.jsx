/*********************************************************
 Author:                Philip Awazie Donvip
 Year Created:          2026
 Description:           React context for real-time notification state and WebSocket lifecycle.
 Modified By:           Philip Awazie Donvip
 Modified Date:         2026-06-04
 Modification Notes:    Added notification history, unread counts, and toast state.
*********************************************************/

// ========================================================
// Imports, dependencies, and context setup
// ========================================================

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import useAuth from './AuthContext';
import wsService from '../services/websocket';

const NotificationContext = createContext(null);
const MAX_NOTIFICATIONS = 50;

export const NotificationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [toast, setToast] = useState(null);

  const addNotification = useCallback((notification) => {
    if (notification.type === 'CONNECTED' || notification.type === 'PONG') {
      return;
    }

    const enrichedNotification = {
      ...notification,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: notification.timestamp || new Date().toISOString(),
    };

    setNotifications((currentNotifications) => [
      enrichedNotification,
      ...currentNotifications,
    ].slice(0, MAX_NOTIFICATIONS));
    setUnreadCount((currentCount) => currentCount + 1);
    setToast(enrichedNotification);
  }, []);

  const markAllRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    const handleStatus = (statusEvent) => {
      setConnectionStatus(statusEvent.status);
    };

    wsService.on('*', addNotification);
    wsService.on('STATUS', handleStatus);

    if (!isAuthenticated || !user?.id) {
      wsService.disconnect({ clearListeners: false });
      setConnectionStatus('disconnected');
      clearNotifications();
    } else {
      wsService.connect(user.id);
    }

    return () => {
      wsService.off('*', addNotification);
      wsService.off('STATUS', handleStatus);
    };
  }, [addNotification, clearNotifications, isAuthenticated, user?.id]);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      setToast(null);
    }, 5000);

    return () => clearTimeout(timeout);
  }, [toast]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      connectionStatus,
      toast,
      dismissToast: () => setToast(null),
      markAllRead,
      clearNotifications,
    }),
    [clearNotifications, connectionStatus, markAllRead, notifications, toast, unreadCount]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

const useNotifications = () => {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }

  return context;
};

export default useNotifications;
