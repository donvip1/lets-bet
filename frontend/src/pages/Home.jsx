/* eslint-disable */
/*********************************************************
 Author:                Philip Awazie Donvip
 Year Created:          2026
 Description:           Home page showing trending database and AI-generated bets.
 Modified By:           Philip Awazie Donvip
 Modified Date:         2026-05-31
 Modification Notes:    Added traceable comments for debugging, handoff, undo, and redo review.
*********************************************************/

// ========================================================
// Imports, dependencies, and module setup
// ========================================================

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import useAuth from '../context/AuthContext';
import { bets as betsApi } from '../services/api';
import BetCard from '../components/BetCard';

const Home = () => {
  const { isAuthenticated } = useAuth();
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBets = async () => {
      try {
        const response = await betsApi.getTrendingBets();
        setBets(response.data.bets || []);
      } catch (err) {
        setError('Failed to load bets');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBets();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Loading bets...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-white mb-4">
          Bet Against Friends on Global Trends
        </h1>
        <p className="text-xl text-gray-400">
          Sports, Politics, Finance, Entertainment - Bet on anything!
        </p>
      </div>

      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-white">Trending Bets</h2>
        {isAuthenticated && (
          <Link
            to="/create-bet"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
          >
            Create New Bet
          </Link>
        )}
      </div>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {bets.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <MagnifyingGlassIcon className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400 text-xl">No bets available yet</p>
          <p className="text-gray-500 mt-2">Be the first to create one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bets.map((bet) => (
            <BetCard key={bet.id} bet={bet} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
