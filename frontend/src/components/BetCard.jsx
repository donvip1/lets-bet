/* eslint-disable */
/*********************************************************
 Author:                Philip Awazie Donvip
 Year Created:          2026
 Description:           Reusable card component for displaying bet summaries and detail links.
 Modified By:           Philip Awazie Donvip
 Modified Date:         2026-05-31
 Modification Notes:    Added traceable comments for debugging, handoff, undo, and redo review.
*********************************************************/

// ========================================================
// Imports, dependencies, and module setup
// ========================================================

import React from 'react';
import { Link } from 'react-router-dom';

const BetCard = ({ bet }) => {
  const getTimeRemaining = (deadline) => {
    const now = new Date();
    const end = new Date(deadline);
    const diff = end - now;

    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  const timeRemaining = getTimeRemaining(bet.deadline);
  const currency = String(bet.currency || '').toUpperCase();
  const currencySymbols = { NGN: '₦', USD: '$', BTC: '₿', ETH: 'Ξ' };
  const symbol = currencySymbols[currency] || bet.currency;

  return (
    <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition duration-200">
      <h3 className="text-xl font-bold text-white mb-3">{bet.topic}</h3>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">{bet.outcome_a}</span>
          <span className="text-blue-400 font-semibold">50%</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">{bet.outcome_b}</span>
          <span className="text-blue-400 font-semibold">50%</span>
        </div>
      </div>

      <div className="flex justify-between items-center text-sm mb-4">
        <span className="text-gray-400">Pool:</span>
        <span className="text-white font-semibold">
          {symbol}
          {bet.total_stakes}
        </span>
      </div>

      <div className="flex justify-between items-center text-sm mb-4">
        <span className="text-gray-400">Time left:</span>
        <span className="text-yellow-400">{timeRemaining}</span>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500 uppercase">{bet.category}</span>
        <Link
          to={`/bets/${bet.id}`}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
        >
          Join Bet
        </Link>
      </div>
    </div>
  );
};

export default BetCard;
