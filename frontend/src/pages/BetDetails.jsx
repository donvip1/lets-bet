/* eslint-disable */
/*********************************************************
 Author:                Philip Awazie Donvip
 Year Created:          2026
 Description:           Bet detail page with participants list and join-bet modal.
 Modified By:           Philip Awazie Donvip
 Modified Date:         2026-05-31
 Modification Notes:    Added traceable comments for debugging, handoff, undo, and redo review.
*********************************************************/

// ========================================================
// Imports, dependencies, and module setup
// ========================================================

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ClockIcon,
  CurrencyDollarIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import useAuth from '../context/AuthContext';
import { bets } from '../services/api';

const BetDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [bet, setBet] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinOutcome, setJoinOutcome] = useState('');
  const [stakeAmount, setStakeAmount] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const fetchBetDetails = async () => {
      try {
        const response = await bets.getBetById(id);
        setBet(response.data.bet);
        setParticipants(response.data.participants || []);
      } catch (err) {
        setError('Failed to load bet details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBetDetails();
  }, [id]);

  const handleJoinBet = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!joinOutcome || !stakeAmount) {
      setError('Please select outcome and enter stake amount');
      return;
    }

    setJoining(true);
    setError('');

    try {
      await bets.joinBet(id, {
        outcome: joinOutcome,
        stakeAmount: parseFloat(stakeAmount),
      });

      alert('Bet joined successfully!');
      setShowJoinModal(false);
      setJoinOutcome('');
      setStakeAmount('');

      const response = await bets.getBetById(id);
      setBet(response.data.bet);
      setParticipants(response.data.participants || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join bet');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Loading bet details...</div>
      </div>
    );
  }

  if (!bet) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded">
          Bet not found
        </div>
      </div>
    );
  }

  const currency = String(bet.currency || '').toUpperCase();
  const currencySymbols = { NGN: '₦', USD: '$', BTC: '₿', ETH: 'Ξ' };
  const symbol = currencySymbols[currency] || bet.currency;
  const statusColors = {
    OPEN: 'bg-green-900 text-green-200',
    LOCKED: 'bg-yellow-900 text-yellow-200',
    SETTLED: 'bg-blue-900 text-blue-200',
    CANCELLED: 'bg-gray-700 text-gray-300',
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate('/')}
        className="text-blue-400 hover:text-blue-300 mb-6"
      >
        ← Back to bets
      </button>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-3xl font-bold text-white">{bet.topic}</h1>
          <span
            className={`px-3 py-1 rounded text-sm ${
              statusColors[bet.status] || statusColors.CANCELLED
            }`}
          >
            {bet.status}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-700 rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-1">{bet.outcome_a}</p>
            <p className="text-2xl font-bold text-blue-400">50%</p>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-1">{bet.outcome_b}</p>
            <p className="text-2xl font-bold text-blue-400">50%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <CurrencyDollarIcon className="h-5 w-5 text-green-400 mr-2" />
              <p className="text-gray-400 text-sm">Pool</p>
            </div>
            <p className="text-2xl font-bold text-white">
              {symbol}
              {bet.total_stakes}
            </p>
          </div>

          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <UsersIcon className="h-5 w-5 text-blue-400 mr-2" />
              <p className="text-gray-400 text-sm">Participants</p>
            </div>
            <p className="text-2xl font-bold text-white">
              {participants.length}
            </p>
          </div>

          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <ClockIcon className="h-5 w-5 text-yellow-400 mr-2" />
              <p className="text-gray-400 text-sm">Category</p>
            </div>
            <p className="text-lg font-bold text-white capitalize">
              {bet.category}
            </p>
          </div>
        </div>

        <div className="text-sm text-gray-400">
          <p>Created by: {bet.creator_name}</p>
          <p>Deadline: {new Date(bet.deadline).toLocaleString()}</p>
        </div>
      </div>

      {bet.status === 'OPEN' && (
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Join this Bet</h2>
          {isAuthenticated ? (
            <button
              onClick={() => setShowJoinModal(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium"
            >
              Join Bet
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium"
            >
              Login to Join
            </button>
          )}
        </div>
      )}

      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">
          Participants ({participants.length})
        </h2>

        {participants.length === 0 ? (
          <p className="text-gray-400 text-center py-8">
            No participants yet. Be the first!
          </p>
        ) : (
          <div className="space-y-3">
            {participants.map((participant) => (
              <div key={participant.id} className="bg-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-white font-medium">
                      {participant.name || participant.user?.name || 'Anonymous'}
                    </p>
                    <p className="text-gray-400 text-sm">
                      Picked:{' '}
                      <span className="text-blue-400">
                        {participant.outcome === 'A'
                          ? bet.outcome_a
                          : bet.outcome_b}
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">
                      {symbol}
                      {participant.stake_amount}
                    </p>
                    <p className="text-gray-400 text-xs">staked</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showJoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Join Bet</h3>

            <div className="mb-4">
              <label className="block text-gray-300 text-sm mb-2">
                Choose Outcome
              </label>
              <div className="space-y-2">
                <label className="flex items-center p-3 border border-gray-600 rounded-lg cursor-pointer hover:bg-gray-700">
                  <input
                    type="radio"
                    name="outcome"
                    value="A"
                    checked={joinOutcome === 'A'}
                    onChange={(e) => setJoinOutcome(e.target.value)}
                    className="mr-3"
                  />
                  <span className="text-white">{bet.outcome_a}</span>
                </label>
                <label className="flex items-center p-3 border border-gray-600 rounded-lg cursor-pointer hover:bg-gray-700">
                  <input
                    type="radio"
                    name="outcome"
                    value="B"
                    checked={joinOutcome === 'B'}
                    onChange={(e) => setJoinOutcome(e.target.value)}
                    className="mr-3"
                  />
                  <span className="text-white">{bet.outcome_b}</span>
                </label>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-gray-300 text-sm mb-2">
                Stake Amount
              </label>
              <input
                type="number"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                className="w-full px-4 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Min ${symbol}100`}
              />
            </div>

            <div className="flex space-x-4">
              <button
                onClick={handleJoinBet}
                disabled={joining}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded disabled:opacity-50"
              >
                {joining ? 'Joining...' : 'Confirm'}
              </button>
              <button
                onClick={() => setShowJoinModal(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BetDetails;
