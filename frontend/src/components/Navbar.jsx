import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRightOnRectangleIcon,
  IdentificationIcon,
} from '@heroicons/react/24/outline';
import useAuth from '../context/AuthContext';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
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
                <span className="text-gray-300">Hello, {user?.name}</span>
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
  );
};

export default Navbar;
