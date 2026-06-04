/*********************************************************
 Author:                Philip Awazie Donvip
 Year Created:          2026
 Description:           Navbar notification bell with dropdown history and toast display.
 Modified By:           Philip Awazie Donvip
 Modified Date:         2026-06-04
 Modification Notes:    Added traceable real-time notification UI backed by NotificationContext.
*********************************************************/

// ========================================================
// Imports, dependencies, and component setup
// ========================================================

import React from 'react';
import { Popover } from '@headlessui/react';
import { BellIcon, XMarkIcon } from '@heroicons/react/24/outline';
import useAuth from '../context/AuthContext';
import useNotifications from '../context/NotificationContext';
import wsService from '../services/websocket';

const getNotificationIcon = (type) => {
  switch (type) {
    case 'BET_CREATED':
      return '📌';
    case 'BET_JOINED':
      return '🎉';
    case 'BET_SETTLED':
      return '🏆';
    case 'DEPOSIT_COMPLETED':
      return '💰';
    case 'WITHDRAWAL_COMPLETED':
      return '💸';
    default:
      return '📢';
  }
};

const getNotificationColor = (type) => {
  switch (type) {
    case 'BET_CREATED':
      return 'bg-cyan-500';
    case 'BET_JOINED':
      return 'bg-blue-500';
    case 'BET_SETTLED':
      return 'bg-green-500';
    case 'DEPOSIT_COMPLETED':
      return 'bg-yellow-500';
    case 'WITHDRAWAL_COMPLETED':
      return 'bg-purple-500';
    default:
      return 'bg-gray-500';
  }
};

const formatNotificationTime = (timestamp) => {
  if (!timestamp) {
    return 'Just now';
  }

  return new Date(timestamp).toLocaleString();
};

const NotificationBell = () => {
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    connectionStatus,
    toast,
    dismissToast,
    markAllRead,
    clearNotifications,
  } = useNotifications();

  const handleReconnect = () => {
    if (user?.id) {
      wsService.connect(user.id);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <Popover className="relative">
        {({ open }) => (
          <>
            <Popover.Button
              type="button"
              onClick={markAllRead}
              className="relative p-2 text-gray-300 hover:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              title={`Notifications ${connectionStatus}`}
            >
              <BellIcon className="h-6 w-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs min-w-5 h-5 px-1 rounded-full flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Popover.Button>

            {open && (
              <Popover.Panel
                static
                className="absolute right-0 top-12 w-80 max-w-[calc(100vw-2rem)] bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50"
              >
                <div className="p-4">
                  <div className="flex justify-between items-start mb-4 gap-3">
                    <div>
                      <h3 className="text-white font-bold text-lg">
                        Notifications
                      </h3>
                      <button
                        type="button"
                        onClick={handleReconnect}
                        className="flex items-center gap-2 text-xs text-gray-400 hover:text-white capitalize mt-1"
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            connectionStatus === 'connected'
                              ? 'bg-green-400'
                              : 'bg-yellow-400'
                          }`}
                        />
                        {connectionStatus}
                      </button>
                    </div>

                    {notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={clearNotifications}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  {notifications.length === 0 ? (
                    <div className="text-center py-8">
                      <BellIcon className="h-12 w-12 text-gray-500 mx-auto mb-2" />
                      <p className="text-gray-400">No notifications yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className="p-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition"
                        >
                          <div className="flex items-start">
                            <span className="text-2xl mr-3">
                              {getNotificationIcon(notification.type)}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`h-2 w-2 rounded-full ${getNotificationColor(
                                    notification.type
                                  )}`}
                                />
                                <p className="text-white font-medium truncate">
                                  {notification.title}
                                </p>
                              </div>
                              <p className="text-gray-300 text-sm mt-1">
                                {notification.message}
                              </p>
                              <p className="text-gray-500 text-xs mt-2">
                                {formatNotificationTime(notification.timestamp)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Popover.Panel>
            )}
          </>
        )}
      </Popover>

      {toast && (
        <div className="fixed top-20 right-4 left-4 sm:left-auto sm:w-96 bg-gray-800 border border-blue-500 rounded-md shadow-xl z-50">
          <div className="flex items-start justify-between gap-4 p-4">
            <div>
              <p className="text-white font-semibold">{toast.title}</p>
              <p className="text-gray-300 text-sm mt-1">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={dismissToast}
              className="text-gray-400 hover:text-white"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default NotificationBell;
