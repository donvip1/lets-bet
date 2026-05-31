/* eslint-disable */
/*********************************************************
 Author:                Philip Awazie Donvip
 Year Created:          2026
 Description:           Authenticated dashboard page for wallet balances, bets, and transactions.
 Modified By:           Philip Awazie Donvip
 Modified Date:         2026-05-31
 Modification Notes:    Added traceable comments for debugging, handoff, undo, and redo review.
*********************************************************/

// ========================================================
// Imports, dependencies, and module setup
// ========================================================

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClockIcon, WalletIcon } from '@heroicons/react/24/outline';
import { bets, wallet as walletApi } from '../services/api';

const Dashboard = () => {
  const [wallet, setWallet] = useState(null);
  const [myBets, setMyBets] = useState({ active: [], completed: [] });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [walletRes, betsRes, transactionsRes] = await Promise.all([
          walletApi.getBalance(),
          bets.getMyBets(),
          walletApi.getTransactions(),
        ]);

        setWallet(walletRes.data);
        setMyBets(betsRes.data);
        setTransactions(transactionsRes.data.transactions || []);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Loading dashboard...</div>
      </div>
    );
  }

  const currencySymbols = { NGN: '₦', USD: '$', BTC: '₿', ETH: 'Ξ' };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">Dashboard</h1>

      <div className="bg-gray-800 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <WalletIcon className="h-8 w-8 mr-3 text-blue-400" />
            Your Wallet
          </h2>
          <div className="space-x-3">
            <Link
              to="/wallet"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Deposit
            </Link>
            <Link
              to="/wallet"
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
            >
              Withdraw
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-700 rounded-lg p-4">
            <p className="text-gray-400 text-sm">NGN Balance</p>
            <p className="text-2xl font-bold text-white">
              {wallet ? `₦${wallet.balance_ngn}` : '₦0'}
            </p>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <p className="text-gray-400 text-sm">USD Balance</p>
            <p className="text-2xl font-bold text-white">
              {wallet ? `$${wallet.balance_usd}` : '$0'}
            </p>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <p className="text-gray-400 text-sm">BTC Balance</p>
            <p className="text-2xl font-bold text-white">
              {wallet ? `₿${wallet.balance_btc}` : '₿0'}
            </p>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <p className="text-gray-400 text-sm">ETH Balance</p>
            <p className="text-2xl font-bold text-white">
              {wallet ? `Ξ${wallet.balance_eth}` : 'Ξ0'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-bold text-white flex items-center mb-6">
          <ClockIcon className="h-8 w-8 mr-3 text-yellow-400" />
          Active Bets
        </h2>

        {myBets.active?.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No active bets</p>
            <Link
              to="/"
              className="text-blue-400 hover:text-blue-300 mt-2 inline-block"
            >
              Browse available bets
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {myBets.active?.map((bet) => (
              <div key={bet.id} className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-bold text-white mb-2">
                  {bet.topic}
                </h3>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">
                    Your pick:{' '}
                    <span className="text-blue-400">{bet.outcome}</span>
                  </span>
                  <span className="text-gray-400">
                    Stake: {currencySymbols[bet.currency] || bet.currency}
                    {bet.stake_amount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-6">
          Recent Transactions
        </h2>

        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No transactions yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-gray-400 py-2">Date</th>
                  <th className="text-left text-gray-400 py-2">Type</th>
                  <th className="text-left text-gray-400 py-2">Amount</th>
                  <th className="text-left text-gray-400 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 5).map((tx) => (
                  <tr key={tx.id} className="border-b border-gray-700">
                    <td className="py-3 text-gray-300">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-gray-300">{tx.type}</td>
                    <td className="py-3 text-gray-300">
                      {tx.currency} {tx.amount}
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          tx.status === 'COMPLETED'
                            ? 'bg-green-900 text-green-200'
                            : tx.status === 'PENDING'
                              ? 'bg-yellow-900 text-yellow-200'
                              : 'bg-red-900 text-red-200'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
