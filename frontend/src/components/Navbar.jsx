/* eslint-disable */
/*********************************************************
 Author:                Philip Awazie Donvip
 Year Created:          2026
 Description:           Navigation component with auth-aware links and user actions.
 Modified By:           Philip Awazie Donvip
 Modified Date:         2026-05-31
 Modification Notes:    Added traceable comments for debugging, handoff, undo, and redo review.
*********************************************************/

// ========================================================
// Imports, dependencies, and module setup
// ========================================================

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRightOnRectangleIcon,
  BellIcon,
  IdentificationIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import useAuth from '../context/AuthContext';
import useNotifications from '../context/NotificationContext';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const {
    notifications,
    unreadCount,
    connectionStatus,
    toast,
    dismissToast,
    markAllRead,
    clearNotifications,
  } = useNotifications();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = React.useState(false);

  const handleLogout = () => {
    logout();
    clearNotifications();
    navigate('/login');
  };

  const handleToggleNotifications = () => {
    setShowNotifications((isOpen) => !isOpen);
    markAllRead();
  };

  return (
    <>
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="text-2xl font-bold text-blue-400">
                Lets Bet
              </Link>
              <div className="hidden md:flex ml-10 space-x-4">
                <Link
                  to="/"
                  className="text-gray-300 hover:text-white px-3 py-2 rounded"
                >
                  Home
                </Link>
                {isAuthenticated && (
                  <>
                    <Link
                      to="/dashboard"
                      className="text-gray-300 hover:text-white px-3 py-2 rounded"
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/create-bet"
                      className="text-gray-300 hover:text-white px-3 py-2 rounded"
                    >
                      Create Bet
                    </Link>
                    <Link
                      to="/wallet"
                      className="text-gray-300 hover:text-white px-3 py-2 rounded"
                    >
                      Wallet
                    </Link>
                    <Link
                      to="/kyc"
                      className="text-gray-300 hover:text-white px-3 py-2 rounded flex items-center"
                    >
                      <IdentificationIcon className="h-4 w-4 mr-1" />
                      KYC
                    </Link>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={handleToggleNotifications}
                      className="relative text-gray-300 hover:text-white p-2 rounded"
                      title={`Notifications ${connectionStatus}`}
                    >
                      <BellIcon className="h-6 w-6" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs min-w-5 h-5 px-1 rounded-full flex items-center justify-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>

                    {showNotifications && (
                      <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-gray-800 border border-gray-700 rounded-md shadow-xl z-50">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                          <div>
                            <p className="text-white font-semibold">
                              Notifications
                            </p>
                            <p className="text-xs text-gray-400 capitalize">
                              {connectionStatus}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={clearNotifications}
                            className="text-xs text-gray-400 hover:text-white"
                          >
                            Clear
                          </button>
                        </div>

                        <div className="max-h-96 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <p className="text-gray-400 text-sm p-4">
                              No notifications yet
                            </p>
                          ) : (
                            notifications.map((notification) => (
                              <div
                                key={notification.id}
                                className="px-4 py-3 border-b border-gray-700 last:border-b-0"
                              >
                                <p className="text-white text-sm font-medium">
                                  {notification.title}
                                </p>
                                <p className="text-gray-300 text-sm mt-1">
                                  {notification.message}
                                </p>
                                <p className="text-gray-500 text-xs mt-2">
                                  {new Date(
                                    notification.timestamp
                                  ).toLocaleTimeString()}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <span className="text-gray-300 hidden sm:inline">
                    Hello, {user?.name}
                  </span>
                  {user?.kyc_status === 'pending' && (
                    <span className="bg-yellow-600 text-white text-xs px-2 py-1 rounded">
                      KYC Pending
                    </span>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex items-center text-gray-300 hover:text-white px-3 py-2 rounded"
                  >
                    <ArrowRightOnRectangleIcon className="h-5 w-5 mr-1" />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-gray-300 hover:text-white px-3 py-2 rounded"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

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

export default Navbar;
